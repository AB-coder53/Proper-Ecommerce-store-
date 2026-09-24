import "server-only";

import { randomUUID } from "crypto";
import { cache } from "react";

import type { Product } from "@/lib/catalog-types";
import { getProductById, getProducts, invalidateCatalogCache } from "@/lib/catalog.server";
import {
  CART_MAX_QUANTITY,
  IMPORTED_CUSTOMER_PASSWORD,
  ORDER_STATUSES,
  SHIPPING_COST_INR,
} from "@/lib/commerce-constants";
import type {
  AddressInput,
  AdminOrderInput,
  CartItemInput,
  CartLine,
  CheckoutInput,
  CustomerAddress,
  CustomerAdminRow,
  CustomerPublic,
  Order,
  OrderItem,
  WishlistItem,
} from "@/lib/commerce-types";
import { resolveIstefadaDiscount, ISTEFADA_PROMO_CODE } from "@/lib/istefada-offer";
import { quoteCoupon, recordCouponRedemption } from "@/lib/promotions.server";
import { bestApplicableBundle } from "@/lib/store-offers";
import { getBundleOffers } from "@/lib/store-offers.server";
import { makeOrderNumber } from "@/lib/order-id";
import { formatInr, parsePriceInr } from "@/lib/price";
import { productImageForColor } from "@/lib/cart-display";
import { deductOrderInventory, getVariant, restoreOrderInventory } from "@/lib/inventory.server";
import { RELEASE_ORDER_STATUSES } from "@/lib/inventory";
import { normalizeMobile } from "@/lib/reservation-utils";
import { syncPrelaunchLeadsToOrders } from "@/lib/prelaunch-orders.server";
import { getSupabaseWriteClient } from "@/lib/supabase-catalog.server";
import type { SupabaseClient } from "@supabase/supabase-js";

/** Untyped client until supabase/types.ts is regenerated for commerce tables. */
function getCommerceDb(): SupabaseClient {
  return getSupabaseWriteClient() as unknown as SupabaseClient;
}

export type CustomerRecord = {
  id: string;
  email: string;
  passwordHash: string;
  fullName: string;
  phone: string;
  alternatePhone: string | null;
  status: string;
  createdAt: string;
  updatedAt: string;
};

function withDb<T>(dbFn: () => Promise<T>): Promise<T> {
  return dbFn();
}

function val(row: Record<string, unknown>, ...keys: string[]) {
  for (const key of keys) {
    if (row[key] !== undefined && row[key] !== null) return row[key];
  }
  return undefined;
}

function money(value: unknown) {
  const amount = Number(value);
  return Number.isFinite(amount) ? Math.round(amount) : 0;
}

const KNOWN_ORDER_STATUSES = new Set<string>([
  ...ORDER_STATUSES,
  "cancelled",
  "failed",
  "returned",
]);
const KNOWN_PAYMENT_STATUSES = new Set(["pending", "paid", "failed", "refunded"]);

function normalizeToken(value: unknown) {
  return String(value ?? "")
    .trim()
    .toLowerCase()
    .replace(/[\s-]+/g, "_");
}

function normalizeOrderStatus(value: unknown, fallback = "placed") {
  const token = normalizeToken(value);
  return KNOWN_ORDER_STATUSES.has(token) ? token : fallback;
}

function normalizePaymentStatus(value: unknown, fallback = "pending") {
  const token = normalizeToken(value);
  return KNOWN_PAYMENT_STATUSES.has(token) ? token : fallback;
}

function isUuid(value: string) {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(
    value.trim(),
  );
}

function mapCustomerRow(row: Record<string, unknown>): CustomerRecord {
  return {
    id: String(val(row, "id")),
    email: String(val(row, "email")),
    passwordHash: String(val(row, "password_hash", "passwordHash")),
    fullName: String(val(row, "full_name", "fullName")),
    phone: String(val(row, "phone")),
    alternatePhone: (val(row, "alternate_phone", "alternatePhone") ?? null) as string | null,
    status: String(val(row, "status") ?? "active"),
    createdAt: String(val(row, "created_at", "createdAt")),
    updatedAt: String(val(row, "updated_at", "updatedAt")),
  };
}

function mapAddressRow(row: Record<string, unknown>): CustomerAddress {
  return {
    id: String(val(row, "id")),
    customerId: String(val(row, "customer_id", "customerId")),
    label: String(val(row, "label") ?? "Home"),
    line1: String(val(row, "line1")),
    line2: (val(row, "line2") ?? null) as string | null,
    city: String(val(row, "city")),
    state: String(val(row, "state")),
    pincode: String(val(row, "pincode")),
    isDefault: Boolean(val(row, "is_default", "isDefault")),
    createdAt: String(val(row, "created_at", "createdAt")),
    updatedAt: String(val(row, "updated_at", "updatedAt")),
  };
}

const inflightCheckouts = new Map<string, Promise<Order>>();

function isUniqueConstraintError(error: unknown) {
  const err = error as { code?: string; message?: string };
  return err.code === "23505" || /duplicate key|checkout_id/i.test(err.message ?? "");
}

async function findOrderByCheckoutId(
  customerId: string,
  checkoutId: string,
): Promise<Order | null> {
  const order = await withDb(async () => {
    const sb = getCommerceDb();
    const { data, error } = await sb
      .from("orders")
      .select("*")
      .eq("customer_id", customerId)
      .eq("checkout_id", checkoutId)
      .maybeSingle();
    if (error) {
      if (/checkout_id/i.test(error.message ?? "")) return null;
      throw error;
    }
    if (!data) return null;
    return mapOrderRow(data as Record<string, unknown>);
  });
  if (!order) return null;
  const [full] = await attachItems([order]);
  return full ?? { ...order, items: [] };
}

function buildCartLine(
  id: string,
  product: Product,
  size: string,
  color: string,
  quantity: number,
): CartLine {
  const unitPrice = parsePriceInr(product.price);
  return {
    id,
    productId: product.id,
    size,
    color,
    quantity,
    productName: product.name,
    productImage: productImageForColor(product, color),
    unitPrice,
    priceLabel: product.price,
    lineTotal: unitPrice * quantity,
  };
}

function mapOrderRow(row: Record<string, unknown>, items: OrderItem[] = []): Order {
  return {
    id: String(val(row, "id")),
    orderNumber: String(val(row, "order_number", "orderNumber")),
    customerId: String(val(row, "customer_id", "customerId")),
    customerName: String(val(row, "customer_name", "customerName")),
    customerEmail: String(val(row, "customer_email", "customerEmail")),
    customerPhone: String(val(row, "customer_phone", "customerPhone")),
    alternatePhone: (val(row, "alternate_phone", "alternatePhone") ?? null) as string | null,
    addressLine1: String(val(row, "address_line1", "addressLine1")),
    addressLine2: (val(row, "address_line2", "addressLine2") ?? null) as string | null,
    addressCity: String(val(row, "address_city", "addressCity")),
    addressState: String(val(row, "address_state", "addressState")),
    addressPincode: String(val(row, "address_pincode", "addressPincode")),
    subtotal: money(val(row, "subtotal")),
    shippingCost: money(val(row, "shipping_cost", "shippingCost")),
    discount: money(val(row, "discount")),
    totalAmount: money(val(row, "total_amount", "totalAmount")),
    paymentStatus: normalizePaymentStatus(val(row, "payment_status", "paymentStatus")),
    orderStatus: normalizeOrderStatus(val(row, "order_status", "orderStatus")),
    inventoryState:
      (val(row, "inventory_state", "inventoryState") as Order["inventoryState"]) || "none",
    promoCode: (val(row, "promo_code", "promoCode") as string | null) ?? null,
    couponDiscount: money(val(row, "coupon_discount", "couponDiscount")),
    bundleDiscount: money(val(row, "bundle_discount", "bundleDiscount")),
    invoiceNumber: (val(row, "invoice_number", "invoiceNumber") as string | null) ?? null,
    paymentMethod: (val(row, "payment_method", "paymentMethod") as string | null) ?? "prepaid",
    paymentId: (val(row, "payment_id", "paymentId") as string | null) ?? null,
    gatewayOrderId: (val(row, "gateway_order_id", "gatewayOrderId") as string | null) ?? null,
    trackingNumber: (val(row, "tracking_number", "trackingNumber") as string | null) ?? null,
    carrier: (val(row, "carrier") as string | null) ?? null,
    trackingUrl: (val(row, "tracking_url", "trackingUrl") as string | null) ?? null,
    checkoutId: (val(row, "checkout_id", "checkoutId") as string | null) ?? null,
    createdAt: String(val(row, "created_at", "createdAt")),
    updatedAt: String(val(row, "updated_at", "updatedAt")),
    items,
  };
}

function mapOrderItemRow(row: Record<string, unknown>): OrderItem & { orderId: string } {
  return {
    id: String(val(row, "id")),
    orderId: String(val(row, "order_id", "orderId")),
    productId: String(val(row, "product_id", "productId")),
    productName: String(val(row, "product_name", "productName")),
    productImage: (val(row, "product_image", "productImage") ?? null) as string | null,
    size: String(val(row, "size")),
    color: String(val(row, "color")),
    quantity: money(val(row, "quantity")) || Number(val(row, "quantity") ?? 0),
    unitPrice: money(val(row, "unit_price", "unitPrice")),
    lineTotal: money(val(row, "line_total", "lineTotal")),
    variantId: (val(row, "variant_id", "variantId") as string | null) ?? null,
    sku: (val(row, "sku") as string | null) ?? null,
  };
}

export async function findCustomerByEmail(email: string) {
  const normalized = email.trim().toLowerCase();
  return withDb(async () => {
    const sb = getCommerceDb();
    const { data, error } = await sb
      .from("customers")
      .select("*")
      .ilike("email", normalized)
      .maybeSingle();
    if (error) throw error;
    return data ? mapCustomerRow(data as Record<string, unknown>) : null;
  });
}

export const findCustomerById = cache(async (id: string) => {
  return withDb(async () => {
    const sb = getCommerceDb();
    const { data, error } = await sb.from("customers").select("*").eq("id", id).maybeSingle();
    if (error) throw error;
    return data ? mapCustomerRow(data as Record<string, unknown>) : null;
  });
});

export async function createCustomerRecord(customer: CustomerRecord) {
  return withDb(async () => {
    const sb = getCommerceDb();
    const { data, error } = await sb
      .from("customers")
      .insert({
        id: customer.id,
        email: customer.email,
        password_hash: customer.passwordHash,
        full_name: customer.fullName,
        phone: customer.phone,
        alternate_phone: customer.alternatePhone,
        status: customer.status,
        created_at: customer.createdAt,
        updated_at: customer.updatedAt,
      })
      .select("*")
      .single();
    if (error) throw error;
    return mapCustomerRow(data as Record<string, unknown>);
  });
}

export async function updateCustomerProfile(
  customerId: string,
  patch: { fullName: string; phone: string; alternatePhone: string | null },
) {
  const phone = normalizeMobile(patch.phone);
  if (!phone)
    throw Object.assign(new Error("Enter a valid primary mobile number."), { status: 400 });
  const alt = patch.alternatePhone ? normalizeMobile(patch.alternatePhone) : null;
  if (patch.alternatePhone && !alt) {
    throw Object.assign(new Error("Enter a valid alternate mobile number."), { status: 400 });
  }
  const now = new Date().toISOString();

  return withDb(async () => {
    const sb = getCommerceDb();
    const { data, error } = await sb
      .from("customers")
      .update({
        full_name: patch.fullName,
        phone,
        alternate_phone: alt,
        updated_at: now,
      })
      .eq("id", customerId)
      .select("*")
      .single();
    if (error) throw error;
    return mapCustomerRow(data as Record<string, unknown>);
  });
}

export async function setCustomerPasswordHash(customerId: string, passwordHash: string) {
  const now = new Date().toISOString();
  return withDb(async () => {
    const sb = getCommerceDb();
    const { data, error } = await sb
      .from("customers")
      .update({ password_hash: passwordHash, updated_at: now })
      .eq("id", customerId)
      .select("*")
      .single();
    if (error) throw error;
    return mapCustomerRow(data as Record<string, unknown>);
  });
}

export async function listAddresses(customerId: string) {
  return withDb(async () => {
    const sb = getCommerceDb();
    const { data, error } = await sb
      .from("customer_addresses")
      .select("*")
      .eq("customer_id", customerId)
      .order("is_default", { ascending: false });
    if (error) throw error;
    return (data ?? []).map((row) => mapAddressRow(row as Record<string, unknown>));
  });
}

export async function saveAddress(customerId: string, input: AddressInput) {
  const now = new Date().toISOString();
  const id = input.id ?? randomUUID();

  return withDb(async () => {
    const sb = getCommerceDb();
    if (input.isDefault) {
      await sb
        .from("customer_addresses")
        .update({ is_default: false })
        .eq("customer_id", customerId);
    }
    const payload = {
      id,
      customer_id: customerId,
      label: input.label,
      line1: input.line1,
      line2: input.line2 || null,
      city: input.city,
      state: input.state,
      pincode: input.pincode,
      is_default: input.isDefault,
      updated_at: now,
    };
    const { data, error } = await sb
      .from("customer_addresses")
      .upsert({ ...payload, created_at: now }, { onConflict: "id" })
      .select("*")
      .single();
    if (error) throw error;
    return mapAddressRow(data as Record<string, unknown>);
  });
}

export async function deleteAddress(customerId: string, addressId: string) {
  return withDb(async () => {
    const sb = getCommerceDb();
    const { error } = await sb
      .from("customer_addresses")
      .delete()
      .eq("id", addressId)
      .eq("customer_id", customerId);
    if (error) throw error;
  });
}

async function enrichCartLines(
  rows: { id: string; productId: string; size: string; color: string; quantity: number }[],
): Promise<CartLine[]> {
  if (!rows.length) return [];
  const products = await getProducts();
  const byId = new Map(products.map((product) => [product.id, product]));
  const lines: CartLine[] = [];
  for (const row of rows) {
    const product = byId.get(row.productId);
    if (!product) continue;
    const unitPrice = parsePriceInr(product.price);
    lines.push({
      id: row.id,
      productId: row.productId,
      size: row.size,
      color: row.color,
      quantity: row.quantity,
      productName: product.name,
      productImage: productImageForColor(product, row.color),
      unitPrice,
      priceLabel: product.price,
      lineTotal: unitPrice * row.quantity,
    });
  }
  return lines;
}

export async function getCart(customerId: string) {
  const rows = await withDb(async () => {
    const sb = getCommerceDb();
    const { data, error } = await sb.from("cart_items").select("*").eq("customer_id", customerId);
    if (error) throw error;
    return (data ?? []).map((row) => ({
      id: String((row as { id: string }).id),
      productId: String((row as { product_id: string }).product_id),
      size: String((row as { size: string }).size),
      color: String((row as { color: string }).color),
      quantity: Number((row as { quantity: number }).quantity),
    }));
  });
  return enrichCartLines(rows);
}

const recentAdds = new Map<string, number>();
const ADD_DEDUPE_MS = 800;

export async function upsertCartItem(customerId: string, input: CartItemInput) {
  const [product, currentCart] = await Promise.all([
    getProductById(input.productId),
    getCart(customerId),
  ]);
  if (!product) throw Object.assign(new Error("Product not found."), { status: 404 });
  if (!product.sizes.includes(input.size)) {
    throw Object.assign(new Error("Invalid size for this product."), { status: 400 });
  }
  if (!product.colors.includes(input.color)) {
    throw Object.assign(new Error("Invalid colour for this product."), { status: 400 });
  }
  const variant = await getVariant(input.productId, input.color, input.size);
  if (!variant || variant.stock <= 0) {
    throw Object.assign(new Error("This product/variant is currently out of stock."), {
      status: 409,
    });
  }
  const existingLine = currentCart.find(
    (line) =>
      line.productId === input.productId && line.size === input.size && line.color === input.color,
  );
  const existingQty = existingLine?.quantity ?? 0;
  const cap = Math.min(CART_MAX_QUANTITY, variant.stock);
  if (existingQty + input.quantity > cap) {
    throw Object.assign(
      new Error(
        `Only ${cap} units of ${product.name} (${input.color}, size ${input.size}) are currently available.`,
      ),
      { status: 409 },
    );
  }

  const dedupeKey = `${customerId}:${input.productId}:${input.size}:${input.color}`;
  const nowMs = Date.now();
  const last = recentAdds.get(dedupeKey) ?? 0;
  if (nowMs - last < ADD_DEDUPE_MS) {
    return currentCart;
  }
  recentAdds.set(dedupeKey, nowMs);
  const now = new Date().toISOString();
  const nextQty = existingQty + input.quantity;
  const lineId = existingLine?.id ?? randomUUID();

  await withDb(async () => {
    const sb = getCommerceDb();
    if (existingLine) {
      const { error } = await sb
        .from("cart_items")
        .update({ quantity: nextQty, updated_at: now })
        .eq("id", existingLine.id);
      if (error) throw error;
    } else {
      const { error } = await sb.from("cart_items").insert({
        id: lineId,
        customer_id: customerId,
        product_id: input.productId,
        size: input.size,
        color: input.color,
        quantity: input.quantity,
        created_at: now,
        updated_at: now,
      });
      if (error) throw error;
    }
  });

  const nextLine = buildCartLine(lineId, product, input.size, input.color, nextQty);
  if (existingLine) {
    return currentCart.map((line) => (line.id === existingLine.id ? nextLine : line));
  }
  return [...currentCart, nextLine];
}

export async function setCartItemQuantity(customerId: string, itemId: string, quantity: number) {
  if (quantity < 1) return removeCartItem(customerId, itemId);
  const cart = await getCart(customerId);
  const line = cart.find((row) => row.id === itemId);
  let cap = CART_MAX_QUANTITY;
  if (line) {
    const variant = await getVariant(line.productId, line.color, line.size);
    if (!variant || variant.stock <= 0) {
      throw Object.assign(new Error("This product/variant is currently out of stock."), {
        status: 409,
      });
    }
    cap = Math.min(CART_MAX_QUANTITY, variant.stock);
    if (quantity > cap) {
      throw Object.assign(
        new Error(
          `Only ${cap} units of ${line.productName} (${line.color}, size ${line.size}) are currently available.`,
        ),
        { status: 409 },
      );
    }
  }
  const now = new Date().toISOString();
  await withDb(async () => {
    const sb = getCommerceDb();
    const { error } = await sb
      .from("cart_items")
      .update({ quantity: Math.min(cap, quantity), updated_at: now })
      .eq("id", itemId)
      .eq("customer_id", customerId);
    if (error) throw error;
  });
  return getCart(customerId);
}

export async function removeCartItem(customerId: string, itemId: string) {
  await withDb(async () => {
    const sb = getCommerceDb();
    const { error } = await sb
      .from("cart_items")
      .delete()
      .eq("id", itemId)
      .eq("customer_id", customerId);
    if (error) throw error;
  });
  return getCart(customerId);
}

export async function setCartItemVariant(
  customerId: string,
  itemId: string,
  size: string,
  color: string,
) {
  const cart = await getCart(customerId);
  const current = cart.find((line) => line.id === itemId);
  if (!current) throw Object.assign(new Error("Cart item not found."), { status: 404 });
  const product = await getProductById(current.productId);
  if (!product) throw Object.assign(new Error("Product not found."), { status: 404 });
  if (!product.sizes.includes(size)) {
    throw Object.assign(new Error("This size is currently unavailable."), { status: 400 });
  }
  if (!product.colors.includes(color)) {
    throw Object.assign(new Error("This colour is currently unavailable."), { status: 400 });
  }
  if (current.size === size && current.color === color) return cart;

  const variant = await getVariant(current.productId, color, size);
  if (!variant || variant.stock <= 0) {
    throw Object.assign(new Error("This product/variant is currently out of stock."), {
      status: 409,
    });
  }

  const duplicate = cart.find(
    (line) =>
      line.id !== itemId &&
      line.productId === current.productId &&
      line.size === size &&
      line.color === color,
  );
  const mergedQty = (duplicate?.quantity ?? 0) + current.quantity;
  const cap = Math.min(CART_MAX_QUANTITY, variant.stock);
  if (mergedQty > cap) {
    throw Object.assign(
      new Error(
        `Only ${cap} units of ${product.name} (${color}, size ${size}) are currently available.`,
      ),
      { status: 409 },
    );
  }
  const now = new Date().toISOString();

  await withDb(async () => {
    const sb = getCommerceDb();
    if (duplicate) {
      const qty = Math.min(cap, duplicate.quantity + current.quantity);
      const { error: updateError } = await sb
        .from("cart_items")
        .update({ quantity: qty, updated_at: now })
        .eq("id", duplicate.id)
        .eq("customer_id", customerId);
      if (updateError) throw updateError;
      const { error: deleteError } = await sb
        .from("cart_items")
        .delete()
        .eq("id", itemId)
        .eq("customer_id", customerId);
      if (deleteError) throw deleteError;
      return;
    }
    const { error } = await sb
      .from("cart_items")
      .update({ size, color, updated_at: now })
      .eq("id", itemId)
      .eq("customer_id", customerId);
    if (error) throw error;
  });

  return getCart(customerId);
}

export async function clearCart(customerId: string) {
  await withDb(async () => {
    const sb = getCommerceDb();
    const { error } = await sb.from("cart_items").delete().eq("customer_id", customerId);
    if (error) throw error;
  });
}

export async function mergeGuestCart(customerId: string, items: CartItemInput[]) {
  if (!items.length) return getCart(customerId);

  const [products, currentCart] = await Promise.all([getProducts(), getCart(customerId)]);
  const productById = new Map(products.map((product) => [product.id, product]));
  const now = new Date().toISOString();

  type LineWrite = {
    id: string;
    productId: string;
    size: string;
    color: string;
    quantity: number;
    existed: boolean;
  };

  const lines = new Map<string, LineWrite>();
  for (const line of currentCart) {
    lines.set(`${line.productId}|${line.size}|${line.color}`, {
      id: line.id,
      productId: line.productId,
      size: line.size,
      color: line.color,
      quantity: line.quantity,
      existed: true,
    });
  }

  const changed: LineWrite[] = [];
  for (const item of items) {
    const product = productById.get(item.productId);
    if (!product) continue;
    if (!product.sizes.includes(item.size) || !product.colors.includes(item.color)) continue;
    const variant =
      product.variants?.find((row) => row.color === item.color && row.size === item.size) ??
      (await getVariant(item.productId, item.color, item.size));
    if (!variant || variant.stock <= 0) continue;
    const key = `${item.productId}|${item.size}|${item.color}`;
    const existing = lines.get(key);
    const existingQty = existing?.quantity ?? 0;
    const cap = Math.min(CART_MAX_QUANTITY, variant.stock);
    const nextQty = Math.min(cap, existingQty + item.quantity);
    if (nextQty <= existingQty) continue;
    const next: LineWrite = {
      id: existing?.id ?? randomUUID(),
      productId: item.productId,
      size: item.size,
      color: item.color,
      quantity: nextQty,
      existed: Boolean(existing),
    };
    lines.set(key, next);
    changed.push(next);
  }

  if (!changed.length) return currentCart;

  await withDb(async () => {
    const sb = getCommerceDb();
    const results = await Promise.all(
      changed.map((line) =>
        line.existed
          ? sb
              .from("cart_items")
              .update({ quantity: line.quantity, updated_at: now })
              .eq("id", line.id)
          : sb.from("cart_items").insert({
              id: line.id,
              customer_id: customerId,
              product_id: line.productId,
              size: line.size,
              color: line.color,
              quantity: line.quantity,
              created_at: now,
              updated_at: now,
            }),
      ),
    );
    const failed = results.find((row) => row.error);
    if (failed?.error) throw failed.error;
  });

  return enrichCartLines(
    [...lines.values()].map((line) => ({
      id: line.id,
      productId: line.productId,
      size: line.size,
      color: line.color,
      quantity: line.quantity,
    })),
  );
}

export async function getWishlist(customerId: string): Promise<WishlistItem[]> {
  const rows = await withDb(async () => {
    const sb = getCommerceDb();
    const { data, error } = await sb
      .from("wishlist_items")
      .select("*")
      .eq("customer_id", customerId)
      .order("created_at", { ascending: false });
    if (error) throw error;
    return (data ?? []).map((row) => ({
      id: String((row as { id: string }).id),
      productId: String((row as { product_id: string }).product_id),
      createdAt: String((row as { created_at: string }).created_at),
    }));
  });

  if (!rows.length) return [];
  const products = await getProducts();
  const byId = new Map(products.map((product) => [product.id, product]));
  const items: WishlistItem[] = [];
  for (const row of rows) {
    const product = byId.get(row.productId);
    if (!product) continue;
    items.push({
      id: row.id,
      productId: row.productId,
      productName: product.name,
      productImage: product.image,
      priceLabel: product.price,
      createdAt: row.createdAt,
    });
  }
  return items;
}

export async function addWishlistItem(customerId: string, productId: string) {
  const product = await getProductById(productId);
  if (!product) throw Object.assign(new Error("Product not found."), { status: 404 });
  const now = new Date().toISOString();
  await withDb(async () => {
    const sb = getCommerceDb();
    const { error } = await sb
      .from("wishlist_items")
      .upsert(
        { id: randomUUID(), customer_id: customerId, product_id: productId, created_at: now },
        { onConflict: "customer_id,product_id", ignoreDuplicates: true },
      );
    if (error) throw error;
  });
  return getWishlist(customerId);
}

export async function removeWishlistItem(customerId: string, productId: string) {
  await withDb(async () => {
    const sb = getCommerceDb();
    const { error } = await sb
      .from("wishlist_items")
      .delete()
      .eq("customer_id", customerId)
      .eq("product_id", productId);
    if (error) throw error;
  });
  return getWishlist(customerId);
}

export type OrderPaymentCapture = {
  paymentStatus?: "paid" | "pending";
  paymentMethod?: string;
  paymentId?: string | null;
  gatewayOrderId?: string | null;
};

export async function placeOrder(
  customer: CustomerPublic,
  input: CheckoutInput,
  payment?: OrderPaymentCapture,
): Promise<Order> {
  const checkoutId = input.checkoutId?.trim() || "";
  if (checkoutId) {
    const existing = await findOrderByCheckoutId(customer.id, checkoutId);
    if (existing) return existing;
    const key = `${customer.id}:${checkoutId}`;
    const pending = inflightCheckouts.get(key);
    if (pending) return pending;
    const task = createPlacedOrder(customer, input, checkoutId, payment);
    inflightCheckouts.set(key, task);
    try {
      return await task;
    } finally {
      inflightCheckouts.delete(key);
    }
  }
  return createPlacedOrder(customer, input, "", payment);
}

async function resolveCheckoutLinesAndTotals(customer: CustomerPublic, input: CheckoutInput) {
  let lines: CartLine[] = [];
  const products = await getProducts();
  const productById = new Map(products.map((product) => [product.id, product]));

  if (input.mode === "buy_now") {
    if (!input.buyNow) throw Object.assign(new Error("Buy Now item is required."), { status: 400 });
    const product = productById.get(input.buyNow.productId);
    if (!product) throw Object.assign(new Error("Product not found."), { status: 404 });
    const unitPrice = parsePriceInr(product.price);
    lines = [
      {
        id: "buy-now",
        productId: product.id,
        size: input.buyNow.size,
        color: input.buyNow.color,
        quantity: input.buyNow.quantity,
        productName: product.name,
        productImage: product.image,
        unitPrice,
        priceLabel: product.price,
        lineTotal: unitPrice * input.buyNow.quantity,
      },
    ];
  } else {
    lines = await getCart(customer.id);
  }

  if (!lines.length) throw Object.assign(new Error("Your cart is empty."), { status: 400 });

  const purchaseIssues: string[] = [];
  const resolvedVariants: { line: CartLine; variantId: string; sku: string }[] = [];
  for (const line of lines) {
    const product = productById.get(line.productId);
    if (!product) {
      purchaseIssues.push(`${line.productName} is no longer available.`);
      continue;
    }
    if (!product.colors.includes(line.color) || !product.sizes.includes(line.size)) {
      purchaseIssues.push(
        `${line.productName} (${line.color}, size ${line.size}) is currently out of stock.`,
      );
      continue;
    }
    const variant = await getVariant(line.productId, line.color, line.size);
    if (!variant || variant.stock <= 0) {
      purchaseIssues.push(
        `This product/variant is currently out of stock. ${line.productName} (${line.color}, size ${line.size}).`,
      );
      continue;
    }
    if (line.quantity > variant.stock) {
      purchaseIssues.push(
        `Only ${variant.stock} units of ${line.productName} (${line.color}, size ${line.size}) are currently available.`,
      );
    }
    const livePrice = parsePriceInr(product.price);
    if (livePrice !== line.unitPrice) {
      purchaseIssues.push(
        `The price of ${line.productName} has changed. Please review your cart before continuing.`,
      );
    }
    resolvedVariants.push({ line, variantId: variant.id, sku: variant.sku });
  }
  if (purchaseIssues.length) {
    throw Object.assign(
      new Error(`Some items in your cart are no longer available. ${purchaseIssues.join(" ")}`),
      {
        status: 409,
      },
    );
  }

  const subtotal = lines.reduce((sum, line) => sum + line.lineTotal, 0);
  const shippingCost = SHIPPING_COST_INR;
  let couponQuote = await quoteCoupon({
    code: input.promoCode,
    customerId: customer.id,
    lines,
  });
  if (!couponQuote.ok && input.promoCode?.trim().toUpperCase() === ISTEFADA_PROMO_CODE) {
    const fallback = resolveIstefadaDiscount(input.promoCode, lines);
    if (fallback > 0) {
      couponQuote = { ok: true, code: ISTEFADA_PROMO_CODE, discount: fallback };
    }
  }
  if (input.promoCode?.trim() && !couponQuote.ok) {
    throw Object.assign(new Error(couponQuote.error || "This coupon is not valid."), {
      status: 409,
    });
  }
  const bundleMatch = bestApplicableBundle(
    await getBundleOffers(),
    products,
    lines.map((line) => line.productId),
  );
  const couponDiscount = couponQuote.ok ? couponQuote.discount : 0;
  const bundleDiscount = bundleMatch?.view.savings ?? 0;
  const discount = couponDiscount + bundleDiscount;
  const totalAmount = Math.max(0, subtotal + shippingCost - discount);
  return {
    lines,
    products,
    resolvedVariants,
    couponQuote,
    subtotal,
    shippingCost,
    couponDiscount,
    bundleDiscount,
    discount,
    totalAmount,
  };
}

export async function quoteCheckout(customer: CustomerPublic, input: CheckoutInput) {
  const quote = await resolveCheckoutLinesAndTotals(customer, input);
  return { totalAmount: quote.totalAmount };
}

async function createPlacedOrder(
  customer: CustomerPublic,
  input: CheckoutInput,
  checkoutId: string,
  payment?: OrderPaymentCapture,
): Promise<Order> {
  const {
    lines,
    products,
    resolvedVariants,
    couponQuote,
    subtotal,
    shippingCost,
    couponDiscount,
    bundleDiscount,
    discount,
    totalAmount,
  } = await resolveCheckoutLinesAndTotals(customer, input);

  let address: CustomerAddress | null = null;
  if (input.addressId) {
    const addresses = await listAddresses(customer.id);
    address = addresses.find((a) => a.id === input.addressId) ?? null;
    if (!address) throw Object.assign(new Error("Selected address not found."), { status: 400 });
  } else if (input.address) {
    address = await saveAddress(customer.id, {
      ...input.address,
      isDefault: input.address.isDefault ?? true,
    });
  } else {
    throw Object.assign(new Error("Delivery address is required."), { status: 400 });
  }

  const altRaw = input.alternatePhone?.trim() || customer.alternatePhone || "";
  const alternatePhone = altRaw ? normalizeMobile(altRaw) : null;
  if (altRaw && !alternatePhone) {
    throw Object.assign(new Error("Enter a valid alternate contact number."), { status: 400 });
  }

  if (alternatePhone) {
    await updateCustomerProfile(customer.id, {
      fullName: customer.fullName,
      phone: customer.phone,
      alternatePhone,
    });
  }

  const now = new Date().toISOString();
  const orderId = randomUUID();
  const orderNumber = makeOrderNumber();

  const orderBase: Omit<Order, "items"> = {
    id: orderId,
    orderNumber,
    customerId: customer.id,
    customerName: customer.fullName,
    customerEmail: customer.email,
    customerPhone: customer.phone,
    alternatePhone,
    addressLine1: address.line1,
    addressLine2: address.line2,
    addressCity: address.city,
    addressState: address.state,
    addressPincode: address.pincode,
    subtotal,
    shippingCost,
    discount,
    totalAmount,
    paymentStatus: payment?.paymentStatus ?? "pending",
    orderStatus: "placed",
    inventoryState: "none",
    promoCode: couponQuote.code || null,
    couponDiscount,
    bundleDiscount,
    invoiceNumber: null,
    paymentMethod: payment?.paymentMethod ?? "prepaid",
    paymentId: payment?.paymentId ?? null,
    gatewayOrderId: payment?.gatewayOrderId ?? null,
    trackingNumber: null,
    carrier: null,
    trackingUrl: null,
    checkoutId: checkoutId || null,
    createdAt: now,
    updatedAt: now,
  };

  const items: (OrderItem & { orderId: string })[] = lines.map((line) => {
    const resolved = resolvedVariants.find(
      (row) =>
        row.line.productId === line.productId &&
        row.line.size === line.size &&
        row.line.color === line.color,
    );
    return {
      id: randomUUID(),
      orderId,
      productId: line.productId,
      productName: line.productName,
      productImage: line.productImage,
      size: line.size,
      color: line.color,
      quantity: line.quantity,
      unitPrice: line.unitPrice,
      lineTotal: line.lineTotal,
      variantId: resolved?.variantId ?? null,
      sku: resolved?.sku ?? null,
    };
  });

  await deductOrderInventory(
    orderId,
    orderNumber,
    lines.map((line) => ({
      productId: line.productId,
      color: line.color,
      size: line.size,
      quantity: line.quantity,
      productName: line.productName,
    })),
  );
  orderBase.inventoryState = "deducted";

  try {
    await withDb(async () => {
      const sb = getCommerceDb();
      const orderPayload: Record<string, unknown> = {
        id: orderBase.id,
        order_number: orderBase.orderNumber,
        customer_id: orderBase.customerId,
        customer_name: orderBase.customerName,
        customer_email: orderBase.customerEmail,
        customer_phone: orderBase.customerPhone,
        alternate_phone: orderBase.alternatePhone,
        address_line1: orderBase.addressLine1,
        address_line2: orderBase.addressLine2,
        address_city: orderBase.addressCity,
        address_state: orderBase.addressState,
        address_pincode: orderBase.addressPincode,
        subtotal: orderBase.subtotal,
        shipping_cost: orderBase.shippingCost,
        discount: orderBase.discount,
        total_amount: orderBase.totalAmount,
        payment_status: orderBase.paymentStatus,
        order_status: orderBase.orderStatus,
        inventory_state: orderBase.inventoryState,
        promo_code: orderBase.promoCode,
        coupon_discount: orderBase.couponDiscount,
        bundle_discount: orderBase.bundleDiscount,
        payment_method: orderBase.paymentMethod,
        payment_id: orderBase.paymentId,
        gateway_order_id: orderBase.gatewayOrderId,
        checkout_id: checkoutId || null,
        created_at: orderBase.createdAt,
        updated_at: orderBase.updatedAt,
      };
      let { error: orderError } = await sb.from("orders").insert(orderPayload);
      if (orderError && /checkout_id/i.test(orderError.message ?? "")) {
        delete orderPayload["checkout_id"];
        ({ error: orderError } = await sb.from("orders").insert(orderPayload));
      }
      if (orderError && /payment_id|gateway_order_id/i.test(orderError.message ?? "")) {
        delete orderPayload["payment_id"];
        delete orderPayload["gateway_order_id"];
        ({ error: orderError } = await sb.from("orders").insert(orderPayload));
      }
      if (orderError) throw orderError;

      const { error: itemsError } = await sb.from("order_items").insert(
        items.map((item) => ({
          id: item.id,
          order_id: item.orderId,
          product_id: item.productId,
          product_name: item.productName,
          product_image: item.productImage,
          size: item.size,
          color: item.color,
          quantity: item.quantity,
          unit_price: item.unitPrice,
          line_total: item.lineTotal,
          variant_id: item.variantId,
          sku: item.sku,
        })),
      );
      if (itemsError) throw itemsError;
    });
  } catch (error) {
    await restoreOrderInventory(
      orderId,
      orderNumber,
      lines.map((line) => ({
        productId: line.productId,
        color: line.color,
        size: line.size,
        quantity: line.quantity,
      })),
      "ORDER_RELEASED",
    );
    await withDb(async () => {
      const sb = getCommerceDb();
      await sb.from("order_items").delete().eq("order_id", orderId);
      await sb.from("orders").delete().eq("id", orderId);
    }).catch(() => undefined);
    if (checkoutId && isUniqueConstraintError(error)) {
      const existing = await findOrderByCheckoutId(customer.id, checkoutId);
      if (existing) return existing;
    }
    throw error;
  }

  invalidateCatalogCache();
  if (couponQuote.ok && couponQuote.couponId && couponDiscount > 0) {
    await recordCouponRedemption({
      couponId: couponQuote.couponId,
      orderId,
      customerId: customer.id,
      code: couponQuote.code,
      discount: couponDiscount,
    });
  }
  if (input.mode === "cart") await clearCart(customer.id);

  return { ...orderBase, items };
}

function mergeOrderItems(
  orders: Omit<Order, "items">[],
  allItems: (OrderItem & { orderId: string })[],
): Order[] {
  const byOrder = new Map<string, OrderItem[]>();
  for (const item of allItems) {
    const list = byOrder.get(item.orderId) ?? [];
    list.push(item);
    byOrder.set(item.orderId, list);
  }
  return orders.map((order) => ({
    ...order,
    items: byOrder.get(order.id) ?? [],
  }));
}

async function attachItems(orders: Omit<Order, "items">[]): Promise<Order[]> {
  if (!orders.length) return [];
  const ids = orders.map((order) => order.id);
  return withDb(async () => {
    const sb = getCommerceDb();
    const { data, error } = await sb.from("order_items").select("*").in("order_id", ids);
    if (error) throw error;
    return mergeOrderItems(
      orders,
      (data ?? []).map((row) => mapOrderItemRow(row as Record<string, unknown>)),
    );
  });
}

async function queryOrders(opts?: { customerId?: string; idOrNumber?: string }): Promise<Order[]> {
  const idOrNumber = opts?.idOrNumber?.trim();
  return withDb(async () => {
    const sb = getCommerceDb();
    let query = sb.from("orders").select("*").order("created_at", { ascending: false });
    if (opts?.customerId) query = query.eq("customer_id", opts.customerId);
    if (idOrNumber) {
      query = isUuid(idOrNumber)
        ? query.eq("id", idOrNumber)
        : query.eq("order_number", idOrNumber.toUpperCase());
    }
    const { data, error } = await query;
    if (error) throw error;
    const orders = (data ?? []).map((row) => mapOrderRow(row as Record<string, unknown>));
    const ids = orders.map((order) => order.id);
    if (!ids.length) return orders;
    const itemsRes = await sb.from("order_items").select("*").in("order_id", ids);
    if (itemsRes.error) {
      console.error("[orders] could not load order items", itemsRes.error);
      return orders.map((order) => ({ ...order, items: [] }));
    }
    return mergeOrderItems(
      orders,
      (itemsRes.data ?? []).map((row) => mapOrderItemRow(row as Record<string, unknown>)),
    );
  });
}

export async function listOrdersForCustomer(customerId: string) {
  return queryOrders({ customerId });
}

export async function getOrderForCustomer(customerId: string, orderIdOrNumber: string) {
  const orders = await queryOrders({ customerId, idOrNumber: orderIdOrNumber });
  return (
    orders.find(
      (order) =>
        order.id === orderIdOrNumber ||
        order.orderNumber.toUpperCase() === orderIdOrNumber.trim().toUpperCase(),
    ) ??
    orders[0] ??
    null
  );
}

export async function findOrderByNumber(orderNumber: string) {
  const orders = await queryOrders({ idOrNumber: orderNumber.trim().toUpperCase() });
  return orders[0] ?? null;
}

export async function listAllOrders() {
  try {
    await syncPrelaunchLeadsToOrders();
  } catch (error) {
    console.error("[prelaunch-import]", error);
  }
  return queryOrders();
}

export async function getOrderById(orderId: string) {
  const orders = await queryOrders({ idOrNumber: orderId });
  return orders[0] ?? null;
}

export async function ensureInvoiceNumber(orderId: string) {
  const order = await getOrderById(orderId);
  if (!order) throw Object.assign(new Error("Order not found."), { status: 404 });
  if (order.invoiceNumber) return order;
  const invoiceNumber = `INV-${order.orderNumber}`;
  const now = new Date().toISOString();
  await withDb(async () => {
    const sb = getCommerceDb();
    const { error } = await sb
      .from("orders")
      .update({ invoice_number: invoiceNumber, updated_at: now })
      .eq("id", order.id);
    if (error && /invoice_number/.test(error.message)) return;
    if (error) throw error;
  });
  return { ...order, invoiceNumber };
}

export async function updateOrderStatus(
  orderId: string,
  orderStatus: string,
  extras?: {
    paymentStatus?: string | undefined;
    trackingNumber?: string | undefined;
    carrier?: string | undefined;
    trackingUrl?: string | undefined;
  },
) {
  const existing = await getOrderById(orderId);
  if (!existing) throw Object.assign(new Error("Order not found."), { status: 404 });
  const now = new Date().toISOString();
  const nextStatus = normalizeOrderStatus(orderStatus, existing.orderStatus);
  const paymentStatus = normalizePaymentStatus(
    extras?.paymentStatus?.trim() || existing.paymentStatus,
    existing.paymentStatus,
  );
  const trackingNumber =
    extras?.trackingNumber === undefined
      ? (existing.trackingNumber ?? null)
      : extras.trackingNumber.trim() || null;
  const carrier =
    extras?.carrier === undefined ? (existing.carrier ?? null) : extras.carrier.trim() || null;
  const trackingUrl =
    extras?.trackingUrl === undefined
      ? (existing.trackingUrl ?? null)
      : extras.trackingUrl.trim() || null;
  let inventoryState = existing.inventoryState ?? "none";
  if (RELEASE_ORDER_STATUSES.has(nextStatus) && inventoryState === "deducted") {
    await restoreOrderInventory(
      existing.id,
      existing.orderNumber,
      existing.items.map((item) => ({
        productId: item.productId,
        color: item.color,
        size: item.size,
        quantity: item.quantity,
      })),
      nextStatus === "returned" || paymentStatus === "refunded"
        ? "ORDER_REFUNDED"
        : "ORDER_CANCELLED",
    );
    inventoryState = "restored";
    invalidateCatalogCache();
  }
  return withDb(async () => {
    const sb = getCommerceDb();
    const payload: Record<string, unknown> = {
      order_status: nextStatus,
      payment_status: paymentStatus,
      inventory_state: inventoryState,
      tracking_number: trackingNumber,
      carrier,
      tracking_url: trackingUrl,
      updated_at: now,
    };
    let { data, error } = await sb
      .from("orders")
      .update(payload)
      .eq("id", existing.id)
      .select("*")
      .maybeSingle();
    if (error && /tracking_number|carrier|tracking_url/.test(error.message)) {
      const { tracking_number: _a, carrier: _b, tracking_url: _c, ...rest } = payload;
      void _a;
      void _b;
      void _c;
      ({ data, error } = await sb
        .from("orders")
        .update(rest)
        .eq("id", existing.id)
        .select("*")
        .maybeSingle());
    }
    if (error) throw error;
    if (!data) throw Object.assign(new Error("Order not found."), { status: 404 });
    const mapped = mapOrderRow(data as Record<string, unknown>);
    const itemsRes = await sb.from("order_items").select("*").eq("order_id", existing.id);
    if (itemsRes.error) {
      console.error("[orders] could not reload order items", itemsRes.error);
      return { ...mapped, items: existing.items };
    }
    return (
      mergeOrderItems(
        [mapped],
        (itemsRes.data ?? []).map((row) => mapOrderItemRow(row as Record<string, unknown>)),
      )[0] ?? { ...mapped, items: existing.items }
    );
  });
}

async function ensureCustomerForAdminOrder(input: {
  name: string;
  email: string;
  phone: string;
  alternatePhone: string | null;
}) {
  const email = input.email.trim().toLowerCase();
  const phone = normalizeMobile(input.phone);
  if (!phone) {
    throw Object.assign(new Error("Enter a valid 10-digit Indian mobile number."), { status: 400 });
  }
  const existing = await findCustomerByEmail(email);
  if (existing) return existing;
  const now = new Date().toISOString();
  return createCustomerRecord({
    id: randomUUID(),
    email,
    passwordHash: IMPORTED_CUSTOMER_PASSWORD,
    fullName: input.name,
    phone,
    alternatePhone: input.alternatePhone,
    status: "active",
    createdAt: now,
    updatedAt: now,
  });
}

async function resolveAdminOrderItems(input: AdminOrderInput) {
  const products = await getProducts();
  const items: (OrderItem & { orderId: string })[] = [];
  for (const row of input.items) {
    const product = products.find((item) => item.id === row.productId);
    const quantity = row.quantity;
    const unitPrice = product ? row.unitPrice || parsePriceInr(product.price) : row.unitPrice;
    const color = row.color.trim();
    const size = row.size.trim();
    items.push({
      id: randomUUID(),
      orderId: "",
      productId: product?.id || row.productId?.trim() || "custom-item",
      productName: product?.name || row.productName,
      productImage: product
        ? productImageForColor(product, color)
        : row.productImage?.trim() || null,
      size,
      color,
      quantity,
      unitPrice,
      lineTotal: unitPrice * quantity,
      variantId: null,
      sku: null,
    });
  }
  return items;
}

async function applyAdminInventory(
  orderId: string,
  orderNumber: string,
  items: OrderItem[],
  orderStatus: string,
  previous?: Order,
) {
  const shouldHold = !RELEASE_ORDER_STATUSES.has(orderStatus);
  let inventoryState = previous?.inventoryState ?? "none";
  if (inventoryState === "deducted") {
    await restoreOrderInventory(
      previous!.id,
      previous!.orderNumber,
      previous!.items.map((item) => ({
        productId: item.productId,
        color: item.color,
        size: item.size,
        quantity: item.quantity,
      })),
      "ORDER_RELEASED",
    );
    inventoryState = "restored";
  }
  if (!shouldHold) return inventoryState;
  if (previous && previous.inventoryState === "none") return "none";
  const stockLines = [];
  for (const item of items) {
    const variant = await getVariant(item.productId, item.color, item.size);
    if (!variant) continue;
    stockLines.push({
      productId: item.productId,
      color: item.color,
      size: item.size,
      quantity: item.quantity,
      productName: item.productName,
    });
  }
  if (stockLines.length) {
    await deductOrderInventory(orderId, orderNumber, stockLines);
    invalidateCatalogCache();
    return "deducted" as const;
  }
  return inventoryState;
}

function adminOrderRow(
  id: string,
  orderNumber: string,
  customerId: string,
  input: AdminOrderInput,
  items: OrderItem[],
  inventoryState: NonNullable<Order["inventoryState"]>,
  now: string,
  createdAt: string,
): Omit<Order, "items"> {
  const subtotal = items.reduce((sum, item) => sum + item.lineTotal, 0);
  const shippingCost = input.shippingCost;
  const discount = input.discount;
  return {
    id,
    orderNumber,
    customerId,
    customerName: input.customerName,
    customerEmail: input.customerEmail.trim().toLowerCase(),
    customerPhone: normalizeMobile(input.customerPhone) || input.customerPhone,
    alternatePhone: input.alternatePhone?.trim()
      ? normalizeMobile(input.alternatePhone) || input.alternatePhone.trim()
      : null,
    addressLine1: input.addressLine1,
    addressLine2: input.addressLine2?.trim() || null,
    addressCity: input.addressCity,
    addressState: input.addressState,
    addressPincode: input.addressPincode,
    subtotal,
    shippingCost,
    discount,
    totalAmount: Math.max(0, subtotal + shippingCost - discount),
    paymentStatus: normalizePaymentStatus(input.paymentStatus),
    orderStatus: normalizeOrderStatus(input.orderStatus),
    inventoryState: inventoryState ?? "none",
    promoCode: null,
    couponDiscount: 0,
    bundleDiscount: discount,
    invoiceNumber: null,
    paymentMethod: "prepaid",
    trackingNumber: input.trackingNumber?.trim() || null,
    carrier: input.carrier?.trim() || null,
    trackingUrl: input.trackingUrl?.trim() || null,
    checkoutId: null,
    createdAt,
    updatedAt: now,
  };
}

function orderInsertPayload(order: Omit<Order, "items">) {
  return {
    id: order.id,
    order_number: order.orderNumber,
    customer_id: order.customerId,
    customer_name: order.customerName,
    customer_email: order.customerEmail,
    customer_phone: order.customerPhone,
    alternate_phone: order.alternatePhone,
    address_line1: order.addressLine1,
    address_line2: order.addressLine2,
    address_city: order.addressCity,
    address_state: order.addressState,
    address_pincode: order.addressPincode,
    subtotal: order.subtotal,
    shipping_cost: order.shippingCost,
    discount: order.discount,
    total_amount: order.totalAmount,
    payment_status: order.paymentStatus,
    order_status: order.orderStatus,
    inventory_state: order.inventoryState,
    promo_code: order.promoCode,
    coupon_discount: order.couponDiscount,
    bundle_discount: order.bundleDiscount,
    payment_method: order.paymentMethod,
    payment_id: order.paymentId,
    gateway_order_id: order.gatewayOrderId,
    tracking_number: order.trackingNumber,
    carrier: order.carrier,
    tracking_url: order.trackingUrl,
    created_at: order.createdAt,
    updated_at: order.updatedAt,
  };
}

export async function createAdminOrder(input: AdminOrderInput): Promise<Order> {
  const customer = await ensureCustomerForAdminOrder({
    name: input.customerName,
    email: input.customerEmail,
    phone: input.customerPhone,
    alternatePhone: input.alternatePhone?.trim()
      ? normalizeMobile(input.alternatePhone) || input.alternatePhone.trim()
      : null,
  });
  const now = new Date().toISOString();
  const orderId = randomUUID();
  const orderNumber = makeOrderNumber();
  const resolved = await resolveAdminOrderItems(input);
  const items = resolved.map((item) => ({ ...item, orderId }));
  const holdStock = !RELEASE_ORDER_STATUSES.has(normalizeOrderStatus(input.orderStatus));
  let inventoryState: NonNullable<Order["inventoryState"]> = "none";
  if (holdStock) {
    inventoryState =
      (await applyAdminInventory(
        orderId,
        orderNumber,
        items,
        normalizeOrderStatus(input.orderStatus),
      )) ?? "none";
  }
  const order = adminOrderRow(
    orderId,
    orderNumber,
    customer.id,
    input,
    items,
    inventoryState,
    now,
    now,
  );
  try {
    await withDb(async () => {
      const sb = getCommerceDb();
      const { error } = await sb.from("orders").insert(orderInsertPayload(order));
      if (error) throw error;
      const { error: itemsError } = await sb.from("order_items").insert(
        items.map((item) => ({
          id: item.id,
          order_id: item.orderId,
          product_id: item.productId,
          product_name: item.productName,
          product_image: item.productImage,
          size: item.size,
          color: item.color,
          quantity: item.quantity,
          unit_price: item.unitPrice,
          line_total: item.lineTotal,
        })),
      );
      if (itemsError) throw itemsError;
    });
  } catch (error) {
    if (inventoryState === "deducted") {
      await restoreOrderInventory(
        orderId,
        orderNumber,
        items.map((item) => ({
          productId: item.productId,
          color: item.color,
          size: item.size,
          quantity: item.quantity,
        })),
        "ORDER_RELEASED",
      ).catch(() => undefined);
    }
    throw error;
  }
  return { ...order, items };
}

export async function updateAdminOrder(orderId: string, input: AdminOrderInput): Promise<Order> {
  const existing = await getOrderById(orderId);
  if (!existing) throw Object.assign(new Error("Order not found."), { status: 404 });
  const customer = await ensureCustomerForAdminOrder({
    name: input.customerName,
    email: input.customerEmail,
    phone: input.customerPhone,
    alternatePhone: input.alternatePhone?.trim()
      ? normalizeMobile(input.alternatePhone) || input.alternatePhone.trim()
      : null,
  });
  const now = new Date().toISOString();
  const resolved = await resolveAdminOrderItems(input);
  const items = resolved.map((item) => ({ ...item, orderId: existing.id }));
  const inventoryState =
    (await applyAdminInventory(
      existing.id,
      existing.orderNumber,
      items,
      normalizeOrderStatus(input.orderStatus),
      existing,
    )) ?? "none";
  const order = adminOrderRow(
    existing.id,
    existing.orderNumber,
    customer.id,
    input,
    items,
    inventoryState,
    now,
    existing.createdAt,
  );
  order.invoiceNumber = existing.invoiceNumber ?? null;
  order.promoCode = existing.promoCode ?? null;
  order.checkoutId = existing.checkoutId ?? null;
  await withDb(async () => {
    const sb = getCommerceDb();
    const { error } = await sb
      .from("orders")
      .update(orderInsertPayload(order))
      .eq("id", existing.id);
    if (error) throw error;
    await sb.from("order_items").delete().eq("order_id", existing.id);
    const { error: itemsError } = await sb.from("order_items").insert(
      items.map((item) => ({
        id: item.id,
        order_id: item.orderId,
        product_id: item.productId,
        product_name: item.productName,
        product_image: item.productImage,
        size: item.size,
        color: item.color,
        quantity: item.quantity,
        unit_price: item.unitPrice,
        line_total: item.lineTotal,
      })),
    );
    if (itemsError) throw itemsError;
  });
  invalidateCatalogCache();
  return { ...order, items };
}

export async function deleteAdminOrder(orderId: string) {
  const existing = await getOrderById(orderId);
  if (!existing) throw Object.assign(new Error("Order not found."), { status: 404 });
  if (existing.inventoryState === "deducted") {
    await restoreOrderInventory(
      existing.id,
      existing.orderNumber,
      existing.items.map((item) => ({
        productId: item.productId,
        color: item.color,
        size: item.size,
        quantity: item.quantity,
      })),
      "ORDER_CANCELLED",
    );
    invalidateCatalogCache();
  }
  await withDb(async () => {
    const sb = getCommerceDb();
    await sb.from("order_items").delete().eq("order_id", existing.id);
    const { error } = await sb.from("orders").delete().eq("id", existing.id);
    if (error) throw error;
  });
  return { ok: true as const, id: existing.id };
}

async function listAllAddresses(): Promise<CustomerAddress[]> {
  return withDb(async () => {
    const sb = getCommerceDb();
    const { data, error } = await sb.from("customer_addresses").select("*");
    if (error) throw error;
    return (data ?? []).map((row) => mapAddressRow(row as Record<string, unknown>));
  });
}

export async function listCustomersAdmin(): Promise<CustomerAdminRow[]> {
  const [customers, orders, addresses] = await Promise.all([
    withDb(async () => {
      const sb = getCommerceDb();
      const { data, error } = await sb
        .from("customers")
        .select("*")
        .order("created_at", { ascending: false });
      if (error) throw error;
      return (data ?? []).map((row) => mapCustomerRow(row as Record<string, unknown>));
    }),
    listAllOrders(),
    listAllAddresses(),
  ]);

  const addressesByCustomer = new Map<string, CustomerAddress[]>();
  for (const address of addresses) {
    const list = addressesByCustomer.get(address.customerId) ?? [];
    list.push(address);
    addressesByCustomer.set(address.customerId, list);
  }

  return customers.map((customer) => {
    const customerOrders = orders.filter((o) => o.customerId === customer.id);
    const customerAddresses = addressesByCustomer.get(customer.id) ?? [];
    return {
      id: customer.id,
      email: customer.email,
      fullName: customer.fullName,
      phone: customer.phone,
      alternatePhone: customer.alternatePhone,
      status: customer.status,
      createdAt: customer.createdAt,
      totalOrders: customerOrders.length,
      totalSpent: customerOrders.reduce((sum, o) => sum + o.totalAmount, 0),
      defaultAddress: customerAddresses.find((a) => a.isDefault) ?? customerAddresses[0] ?? null,
    };
  });
}

export async function getCustomerAdmin(customerId: string) {
  const customers = await listCustomersAdmin();
  const customer = customers.find((c) => c.id === customerId) ?? null;
  if (!customer) return null;
  const orders = await listOrdersForCustomer(customerId);
  return { customer, orders };
}

export { formatInr };
