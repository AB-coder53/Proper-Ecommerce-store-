import "server-only";

import { randomUUID } from "crypto";
import { promises as fs } from "fs";
import path from "path";

import { getProductById } from "@/lib/catalog.server";
import { SHIPPING_COST_INR } from "@/lib/commerce-constants";
import type {
  AddressInput,
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
import { makeOrderNumber } from "@/lib/order-id";
import { formatInr, parsePriceInr } from "@/lib/price";
import { normalizeMobile } from "@/lib/reservation-utils";
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

type Store = {
  customers: CustomerRecord[];
  addresses: CustomerAddress[];
  wishlist: { id: string; customerId: string; productId: string; createdAt: string }[];
  cart: {
    id: string;
    customerId: string;
    productId: string;
    size: string;
    color: string;
    quantity: number;
    createdAt: string;
    updatedAt: string;
  }[];
  orders: Omit<Order, "items">[];
  orderItems: (OrderItem & { orderId: string })[];
};

const DATA_PATH = path.join(process.cwd(), "data", "commerce.json");
let useFileStore: boolean | null = null;

function emptyStore(): Store {
  return { customers: [], addresses: [], wishlist: [], cart: [], orders: [], orderItems: [] };
}

async function readFileStore(): Promise<Store> {
  try {
    const raw = await fs.readFile(DATA_PATH, "utf8");
    return { ...emptyStore(), ...(JSON.parse(raw) as Partial<Store>) };
  } catch {
    return emptyStore();
  }
}

async function writeFileStore(store: Store) {
  await fs.mkdir(path.dirname(DATA_PATH), { recursive: true });
  await fs.writeFile(DATA_PATH, JSON.stringify(store, null, 2), "utf8");
}

function isMissingRelation(error: { code?: string; message?: string } | null) {
  if (!error) return false;
  return (
    error.code === "42P01" ||
    error.code === "PGRST205" ||
    /relation .* does not exist/i.test(error.message ?? "") ||
    /Could not find the table/i.test(error.message ?? "")
  );
}

async function withDbOrFile<T>(dbFn: () => Promise<T>, fileFn: () => Promise<T>): Promise<T> {
  if (useFileStore === true) return fileFn();
  try {
    const result = await dbFn();
    useFileStore = false;
    return result;
  } catch (error) {
    const err = error as { code?: string; message?: string; status?: number };
    if (err.status === 400 || err.status === 401 || err.status === 404 || err.status === 409)
      throw error;
    if (useFileStore === false && !isMissingRelation(err)) throw error;
    // Missing service role / tables â†’ silent JSON fallback (same pattern as catalog)
    if (
      isMissingRelation(err) ||
      /SUPABASE_SERVICE_ROLE_KEY/i.test(err.message ?? "") ||
      /Missing Supabase/i.test(err.message ?? "")
    ) {
      useFileStore = true;
      return fileFn();
    }
    throw error;
  }
}

function val(row: Record<string, unknown>, ...keys: string[]) {
  for (const key of keys) {
    if (row[key] !== undefined && row[key] !== null) return row[key];
  }
  return undefined;
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
    subtotal: Number(val(row, "subtotal")),
    shippingCost: Number(val(row, "shipping_cost", "shippingCost") ?? 0),
    discount: Number(val(row, "discount") ?? 0),
    totalAmount: Number(val(row, "total_amount", "totalAmount")),
    paymentStatus: String(val(row, "payment_status", "paymentStatus")),
    orderStatus: String(val(row, "order_status", "orderStatus")),
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
    quantity: Number(val(row, "quantity")),
    unitPrice: Number(val(row, "unit_price", "unitPrice")),
    lineTotal: Number(val(row, "line_total", "lineTotal")),
  };
}

export async function findCustomerByEmail(email: string) {
  const normalized = email.trim().toLowerCase();
  return withDbOrFile(
    async () => {
      const sb = getCommerceDb();
      const { data, error } = await sb
        .from("customers")
        .select("*")
        .ilike("email", normalized)
        .maybeSingle();
      if (error) throw error;
      return data ? mapCustomerRow(data as Record<string, unknown>) : null;
    },
    async () => {
      const store = await readFileStore();
      return store.customers.find((c) => c.email.toLowerCase() === normalized) ?? null;
    },
  );
}

export async function findCustomerById(id: string) {
  return withDbOrFile(
    async () => {
      const sb = getCommerceDb();
      const { data, error } = await sb.from("customers").select("*").eq("id", id).maybeSingle();
      if (error) throw error;
      return data ? mapCustomerRow(data as Record<string, unknown>) : null;
    },
    async () => {
      const store = await readFileStore();
      return store.customers.find((c) => c.id === id) ?? null;
    },
  );
}

export async function createCustomerRecord(customer: CustomerRecord) {
  return withDbOrFile(
    async () => {
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
    },
    async () => {
      const store = await readFileStore();
      store.customers.push(customer);
      await writeFileStore(store);
      return customer;
    },
  );
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

  return withDbOrFile(
    async () => {
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
    },
    async () => {
      const store = await readFileStore();
      const idx = store.customers.findIndex((c) => c.id === customerId);
      if (idx < 0) throw Object.assign(new Error("Customer not found."), { status: 404 });
      const current = store.customers[idx]!;
      store.customers[idx] = {
        ...current,
        fullName: patch.fullName,
        phone,
        alternatePhone: alt,
        updatedAt: now,
      };
      await writeFileStore(store);
      return store.customers[idx]!;
    },
  );
}

export async function listAddresses(customerId: string) {
  return withDbOrFile(
    async () => {
      const sb = getCommerceDb();
      const { data, error } = await sb
        .from("customer_addresses")
        .select("*")
        .eq("customer_id", customerId)
        .order("is_default", { ascending: false });
      if (error) throw error;
      return (data ?? []).map((row) => mapAddressRow(row as Record<string, unknown>));
    },
    async () => {
      const store = await readFileStore();
      return store.addresses
        .filter((a) => a.customerId === customerId)
        .sort((a, b) => Number(b.isDefault) - Number(a.isDefault));
    },
  );
}

export async function saveAddress(customerId: string, input: AddressInput) {
  const now = new Date().toISOString();
  const id = input.id ?? randomUUID();

  return withDbOrFile(
    async () => {
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
    },
    async () => {
      const store = await readFileStore();
      if (input.isDefault) {
        store.addresses = store.addresses.map((a) =>
          a.customerId === customerId ? { ...a, isDefault: false } : a,
        );
      }
      const existing = store.addresses.findIndex((a) => a.id === id);
      const row: CustomerAddress = {
        id,
        customerId,
        label: input.label,
        line1: input.line1,
        line2: input.line2 || null,
        city: input.city,
        state: input.state,
        pincode: input.pincode,
        isDefault: input.isDefault,
        createdAt: existing >= 0 ? store.addresses[existing]!.createdAt : now,
        updatedAt: now,
      };
      if (existing >= 0) store.addresses[existing] = row;
      else store.addresses.push(row);
      await writeFileStore(store);
      return row;
    },
  );
}

export async function deleteAddress(customerId: string, addressId: string) {
  return withDbOrFile(
    async () => {
      const sb = getCommerceDb();
      const { error } = await sb
        .from("customer_addresses")
        .delete()
        .eq("id", addressId)
        .eq("customer_id", customerId);
      if (error) throw error;
    },
    async () => {
      const store = await readFileStore();
      store.addresses = store.addresses.filter(
        (a) => !(a.id === addressId && a.customerId === customerId),
      );
      await writeFileStore(store);
    },
  );
}

async function enrichCartLines(
  rows: { id: string; productId: string; size: string; color: string; quantity: number }[],
): Promise<CartLine[]> {
  const lines: CartLine[] = [];
  for (const row of rows) {
    const product = await getProductById(row.productId);
    if (!product) continue;
    const unitPrice = parsePriceInr(product.price);
    lines.push({
      id: row.id,
      productId: row.productId,
      size: row.size,
      color: row.color,
      quantity: row.quantity,
      productName: product.name,
      productImage: product.image,
      unitPrice,
      priceLabel: product.price,
      lineTotal: unitPrice * row.quantity,
    });
  }
  return lines;
}

export async function getCart(customerId: string) {
  const rows = await withDbOrFile(
    async () => {
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
    },
    async () => {
      const store = await readFileStore();
      return store.cart
        .filter((c) => c.customerId === customerId)
        .map((c) => ({
          id: c.id,
          productId: c.productId,
          size: c.size,
          color: c.color,
          quantity: c.quantity,
        }));
    },
  );
  return enrichCartLines(rows);
}

export async function upsertCartItem(customerId: string, input: CartItemInput) {
  const product = await getProductById(input.productId);
  if (!product) throw Object.assign(new Error("Product not found."), { status: 404 });
  if (!product.sizes.includes(input.size)) {
    throw Object.assign(new Error("Invalid size for this product."), { status: 400 });
  }
  if (!product.colors.includes(input.color)) {
    throw Object.assign(new Error("Invalid colour for this product."), { status: 400 });
  }
  const now = new Date().toISOString();

  await withDbOrFile(
    async () => {
      const sb = getCommerceDb();
      const { data: existing } = await sb
        .from("cart_items")
        .select("*")
        .eq("customer_id", customerId)
        .eq("product_id", input.productId)
        .eq("size", input.size)
        .eq("color", input.color)
        .maybeSingle();

      if (existing) {
        const qty = Math.min(
          20,
          Number((existing as { quantity: number }).quantity) + input.quantity,
        );
        const { error } = await sb
          .from("cart_items")
          .update({ quantity: qty, updated_at: now })
          .eq("id", (existing as { id: string }).id);
        if (error) throw error;
      } else {
        const { error } = await sb.from("cart_items").insert({
          id: randomUUID(),
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
    },
    async () => {
      const store = await readFileStore();
      const existing = store.cart.find(
        (c) =>
          c.customerId === customerId &&
          c.productId === input.productId &&
          c.size === input.size &&
          c.color === input.color,
      );
      if (existing) {
        existing.quantity = Math.min(20, existing.quantity + input.quantity);
        existing.updatedAt = now;
      } else {
        store.cart.push({
          id: randomUUID(),
          customerId,
          productId: input.productId,
          size: input.size,
          color: input.color,
          quantity: input.quantity,
          createdAt: now,
          updatedAt: now,
        });
      }
      await writeFileStore(store);
    },
  );

  return getCart(customerId);
}

export async function setCartItemQuantity(customerId: string, itemId: string, quantity: number) {
  if (quantity < 1) return removeCartItem(customerId, itemId);
  const now = new Date().toISOString();
  await withDbOrFile(
    async () => {
      const sb = getCommerceDb();
      const { error } = await sb
        .from("cart_items")
        .update({ quantity: Math.min(20, quantity), updated_at: now })
        .eq("id", itemId)
        .eq("customer_id", customerId);
      if (error) throw error;
    },
    async () => {
      const store = await readFileStore();
      const item = store.cart.find((c) => c.id === itemId && c.customerId === customerId);
      if (item) {
        item.quantity = Math.min(20, quantity);
        item.updatedAt = now;
        await writeFileStore(store);
      }
    },
  );
  return getCart(customerId);
}

export async function removeCartItem(customerId: string, itemId: string) {
  await withDbOrFile(
    async () => {
      const sb = getCommerceDb();
      const { error } = await sb
        .from("cart_items")
        .delete()
        .eq("id", itemId)
        .eq("customer_id", customerId);
      if (error) throw error;
    },
    async () => {
      const store = await readFileStore();
      store.cart = store.cart.filter((c) => !(c.id === itemId && c.customerId === customerId));
      await writeFileStore(store);
    },
  );
  return getCart(customerId);
}

export async function clearCart(customerId: string) {
  await withDbOrFile(
    async () => {
      const sb = getCommerceDb();
      const { error } = await sb.from("cart_items").delete().eq("customer_id", customerId);
      if (error) throw error;
    },
    async () => {
      const store = await readFileStore();
      store.cart = store.cart.filter((c) => c.customerId !== customerId);
      await writeFileStore(store);
    },
  );
}

export async function mergeGuestCart(customerId: string, items: CartItemInput[]) {
  for (const item of items) {
    try {
      await upsertCartItem(customerId, item);
    } catch {
      // skip invalid products
    }
  }
  return getCart(customerId);
}

export async function getWishlist(customerId: string): Promise<WishlistItem[]> {
  const rows = await withDbOrFile(
    async () => {
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
    },
    async () => {
      const store = await readFileStore();
      return store.wishlist
        .filter((w) => w.customerId === customerId)
        .map((w) => ({ id: w.id, productId: w.productId, createdAt: w.createdAt }));
    },
  );

  const items: WishlistItem[] = [];
  for (const row of rows) {
    const product = await getProductById(row.productId);
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
  await withDbOrFile(
    async () => {
      const sb = getCommerceDb();
      const { error } = await sb
        .from("wishlist_items")
        .upsert(
          { id: randomUUID(), customer_id: customerId, product_id: productId, created_at: now },
          { onConflict: "customer_id,product_id", ignoreDuplicates: true },
        );
      if (error) throw error;
    },
    async () => {
      const store = await readFileStore();
      if (!store.wishlist.some((w) => w.customerId === customerId && w.productId === productId)) {
        store.wishlist.push({ id: randomUUID(), customerId, productId, createdAt: now });
        await writeFileStore(store);
      }
    },
  );
  return getWishlist(customerId);
}

export async function removeWishlistItem(customerId: string, productId: string) {
  await withDbOrFile(
    async () => {
      const sb = getCommerceDb();
      const { error } = await sb
        .from("wishlist_items")
        .delete()
        .eq("customer_id", customerId)
        .eq("product_id", productId);
      if (error) throw error;
    },
    async () => {
      const store = await readFileStore();
      store.wishlist = store.wishlist.filter(
        (w) => !(w.customerId === customerId && w.productId === productId),
      );
      await writeFileStore(store);
    },
  );
  return getWishlist(customerId);
}

export async function placeOrder(customer: CustomerPublic, input: CheckoutInput): Promise<Order> {
  let lines: CartLine[] = [];

  if (input.mode === "buy_now") {
    if (!input.buyNow) throw Object.assign(new Error("Buy Now item is required."), { status: 400 });
    const product = await getProductById(input.buyNow.productId);
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

  const subtotal = lines.reduce((sum, line) => sum + line.lineTotal, 0);
  const shippingCost = SHIPPING_COST_INR;
  const discount = 0;
  const totalAmount = subtotal + shippingCost - discount;
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
    paymentStatus: "pending",
    orderStatus: "placed",
    createdAt: now,
    updatedAt: now,
  };

  const items: (OrderItem & { orderId: string })[] = lines.map((line) => ({
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
  }));

  await withDbOrFile(
    async () => {
      const sb = getCommerceDb();
      const { error: orderError } = await sb.from("orders").insert({
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
        created_at: orderBase.createdAt,
        updated_at: orderBase.updatedAt,
      });
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
        })),
      );
      if (itemsError) throw itemsError;
    },
    async () => {
      const store = await readFileStore();
      store.orders.push(orderBase);
      store.orderItems.push(...items);
      await writeFileStore(store);
    },
  );

  if (input.mode === "cart") await clearCart(customer.id);

  return { ...orderBase, items };
}

async function attachItems(orders: Omit<Order, "items">[]): Promise<Order[]> {
  if (!orders.length) return [];
  const ids = orders.map((o) => o.id);
  const allItems = await withDbOrFile(
    async () => {
      const sb = getCommerceDb();
      const { data, error } = await sb.from("order_items").select("*").in("order_id", ids);
      if (error) throw error;
      return (data ?? []).map((row) => mapOrderItemRow(row as Record<string, unknown>));
    },
    async () => {
      const store = await readFileStore();
      return store.orderItems.filter((i) => ids.includes(i.orderId));
    },
  );

  return orders.map((order) => ({
    ...order,
    items: allItems.filter((i) => i.orderId === order.id),
  }));
}

export async function listOrdersForCustomer(customerId: string) {
  const orders = await withDbOrFile(
    async () => {
      const sb = getCommerceDb();
      const { data, error } = await sb
        .from("orders")
        .select("*")
        .eq("customer_id", customerId)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return (data ?? []).map((row) => mapOrderRow(row as Record<string, unknown>));
    },
    async () => {
      const store = await readFileStore();
      return store.orders
        .filter((o) => o.customerId === customerId)
        .sort((a, b) => b.createdAt.localeCompare(a.createdAt));
    },
  );
  return attachItems(orders);
}

export async function getOrderForCustomer(customerId: string, orderIdOrNumber: string) {
  const orders = await listOrdersForCustomer(customerId);
  return orders.find((o) => o.id === orderIdOrNumber || o.orderNumber === orderIdOrNumber) ?? null;
}

export async function trackOrder(orderNumber: string, email: string) {
  const normalizedEmail = email.trim().toLowerCase();
  const normalizedNumber = orderNumber.trim().toUpperCase();

  const order = await withDbOrFile(
    async () => {
      const sb = getCommerceDb();
      const { data, error } = await sb
        .from("orders")
        .select("*")
        .eq("order_number", normalizedNumber)
        .maybeSingle();
      if (error) throw error;
      if (!data) return null;
      const mapped = mapOrderRow(data as Record<string, unknown>);
      if (mapped.customerEmail.toLowerCase() !== normalizedEmail) return null;
      return mapped;
    },
    async () => {
      const store = await readFileStore();
      const found = store.orders.find(
        (o) =>
          o.orderNumber.toUpperCase() === normalizedNumber &&
          o.customerEmail.toLowerCase() === normalizedEmail,
      );
      return found ?? null;
    },
  );

  if (!order) return null;
  const [full] = await attachItems([order]);
  return full ?? null;
}

export async function listAllOrders() {
  const orders = await withDbOrFile(
    async () => {
      const sb = getCommerceDb();
      const { data, error } = await sb
        .from("orders")
        .select("*")
        .order("created_at", { ascending: false });
      if (error) throw error;
      return (data ?? []).map((row) => mapOrderRow(row as Record<string, unknown>));
    },
    async () => {
      const store = await readFileStore();
      return [...store.orders].sort((a, b) => b.createdAt.localeCompare(a.createdAt));
    },
  );
  return attachItems(orders);
}

export async function getOrderById(orderId: string) {
  const orders = await listAllOrders();
  return orders.find((o) => o.id === orderId || o.orderNumber === orderId) ?? null;
}

export async function updateOrderStatus(orderId: string, orderStatus: string) {
  const now = new Date().toISOString();
  await withDbOrFile(
    async () => {
      const sb = getCommerceDb();
      const { error } = await sb
        .from("orders")
        .update({ order_status: orderStatus, updated_at: now })
        .eq("id", orderId);
      if (error) throw error;
    },
    async () => {
      const store = await readFileStore();
      const order = store.orders.find((o) => o.id === orderId);
      if (!order) throw Object.assign(new Error("Order not found."), { status: 404 });
      order.orderStatus = orderStatus;
      order.updatedAt = now;
      await writeFileStore(store);
    },
  );
  return getOrderById(orderId);
}

export async function listCustomersAdmin(): Promise<CustomerAdminRow[]> {
  const customers = await withDbOrFile(
    async () => {
      const sb = getCommerceDb();
      const { data, error } = await sb
        .from("customers")
        .select("*")
        .order("created_at", { ascending: false });
      if (error) throw error;
      return (data ?? []).map((row) => mapCustomerRow(row as Record<string, unknown>));
    },
    async () => {
      const store = await readFileStore();
      return [...store.customers].sort((a, b) => b.createdAt.localeCompare(a.createdAt));
    },
  );

  const orders = await listAllOrders();
  const result: CustomerAdminRow[] = [];
  for (const customer of customers) {
    const customerOrders = orders.filter((o) => o.customerId === customer.id);
    const addresses = await listAddresses(customer.id);
    result.push({
      id: customer.id,
      email: customer.email,
      fullName: customer.fullName,
      phone: customer.phone,
      alternatePhone: customer.alternatePhone,
      status: customer.status,
      createdAt: customer.createdAt,
      totalOrders: customerOrders.length,
      totalSpent: customerOrders.reduce((sum, o) => sum + o.totalAmount, 0),
      defaultAddress: addresses.find((a) => a.isDefault) ?? addresses[0] ?? null,
    });
  }
  return result;
}

export async function getCustomerAdmin(customerId: string) {
  const customers = await listCustomersAdmin();
  const customer = customers.find((c) => c.id === customerId) ?? null;
  if (!customer) return null;
  const orders = await listOrdersForCustomer(customerId);
  return { customer, orders };
}

export { formatInr };
