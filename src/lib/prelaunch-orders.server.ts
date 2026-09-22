import "server-only";

import { randomUUID } from "crypto";

import { IMPORTED_CUSTOMER_PASSWORD } from "@/lib/commerce-constants";
import { parsePriceInr } from "@/lib/price";
import { normalizeMobile } from "@/lib/reservation-utils";
import { getSupabaseWriteClient } from "@/lib/supabase-catalog.server";
import type { SupabaseClient } from "@supabase/supabase-js";

type CatalogProduct = {
  id: string;
  name: string;
  price: string;
  image: string;
  colors: string[];
};

type LeadRow = {
  id: string;
  full_name: string;
  mobile: string;
  email: string | null;
  city: string | null;
  products: string[] | null;
  preferred_size: string | null;
  preferred_color: string | null;
  quantity: number | null;
  discount_code: string | null;
  created_at: string;
  product_details: Record<string, unknown> | null;
};

type BuiltItem = {
  productId: string;
  productName: string;
  productImage: string | null;
  size: string;
  color: string;
  quantity: number;
  unitPrice: number;
};

const PRODUCT_ALIASES: { id: string; aliases: string[] }[] = [
  {
    id: "acid-wash",
    aliases: ["lava-sprayed acid wash oversized", "lava sprayed", "lava-sprayed", "lava"],
  },
  {
    id: "terry-300",
    aliases: ["french terry oversized 300", "french terry 300", "terry 300", "300"],
  },
  {
    id: "terry-260",
    aliases: ["french terry oversized", "french terry 260", "french terry", "terry 260"],
  },
  { id: "sun-faded-240", aliases: ["sun-faded tee", "sun faded"] },
  { id: "oversized-240", aliases: ["oversized tee"] },
  { id: "regular-240", aliases: ["regular fit tee", "regular fit"] },
];

function db(): SupabaseClient {
  return getSupabaseWriteClient() as unknown as SupabaseClient;
}

function titleCase(value: string) {
  return value
    .trim()
    .split(/[\s/]+/)
    .filter(Boolean)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1).toLowerCase())
    .join(" ");
}

function splitList(value: string) {
  return value
    .split(/\s*(?:,|&|\/| and )\s*/i)
    .map((part) => part.trim())
    .filter(Boolean);
}

function splitPrices(value: string) {
  return value
    .split(/\s*,\s+/)
    .map((part) => parsePriceInr(part))
    .filter((amount) => amount > 0);
}

function stripParen(value: string) {
  const match = value.match(/^(.*?)(?:\(([^)]*)\))?\s*$/);
  return {
    body: (match?.[1] ?? value).trim(),
    paren: match?.[2]?.trim() || "",
  };
}

function matchCatalog(token: string, catalog: CatalogProduct[]): CatalogProduct | null {
  const normalized = token
    .replace(/\*\d+\s*$/, "")
    .replace(/[^\w]+/g, " ")
    .trim()
    .toLowerCase();
  if (!normalized || normalized === "general interest") return null;
  const exact = catalog.find((row) => row.name.toLowerCase() === normalized);
  if (exact) return exact;
  const alias = PRODUCT_ALIASES.find((row) =>
    row.aliases.some((name) => normalized === name || normalized.includes(name)),
  );
  if (alias) return catalog.find((row) => row.id === alias.id) ?? null;
  return (
    catalog.find(
      (row) =>
        normalized.includes(row.name.toLowerCase()) || row.name.toLowerCase().includes(normalized),
    ) ?? null
  );
}

function tokenQuantity(token: string, fallback: number) {
  const match = token.match(/\*(\d+)\s*$/);
  if (match) return Math.max(1, Number(match[1]));
  return Math.max(1, fallback);
}

function pickColor(raw: string, product: CatalogProduct | null) {
  const value = raw.trim().replace(/\bbalck\b/gi, "black");
  if (!value) return product?.colors[0] ?? "—";
  const found = product?.colors.find((color) => color.toLowerCase() === value.toLowerCase());
  return found ?? titleCase(value);
}

function pickSize(raw: string | null | undefined) {
  const value = String(raw ?? "")
    .trim()
    .toUpperCase();
  return /^(S|M|L|XL|XXL)$/.test(value) ? value : value || "—";
}

export function itemsFromPrelaunchLead(lead: LeadRow, catalog: CatalogProduct[]): BuiltItem[] {
  const details = lead.product_details ?? {};
  const detailId = String(details["id"] ?? "");
  const catalogById = catalog.find((row) => row.id === detailId);
  const size = pickSize(String(details["size"] ?? lead.preferred_size ?? ""));
  const fallbackQty = Math.max(1, Number(lead.quantity ?? 1) || 1);
  const imageFromDetails = String(details["image"] ?? "") || null;
  const priceBits = splitPrices(String(details["price"] ?? ""));

  if (catalogById) {
    const color = pickColor(String(details["color"] ?? lead.preferred_color ?? ""), catalogById);
    const unitPrice = parsePriceInr(catalogById.price) || priceBits[0] || 0;
    return [
      {
        productId: catalogById.id,
        productName: catalogById.name,
        productImage: imageFromDetails || catalogById.image,
        size,
        color,
        quantity: fallbackQty,
        unitPrice,
      },
    ];
  }

  const rawLabel =
    [String(details["name"] ?? ""), ...(lead.products ?? [])]
      .map((value) => value.trim())
      .find(Boolean) ?? "General Interest";
  const { body, paren } = stripParen(rawLabel);
  const colorSource = paren || String(details["color"] ?? lead.preferred_color ?? "");
  const colors = splitList(colorSource);
  const tokens = splitList(body);
  const matched = tokens
    .map((token) => ({
      token,
      product: matchCatalog(token, catalog),
      quantity: tokenQuantity(token, 1),
    }))
    .filter((row) => row.product);

  if (!matched.length) {
    const general = /general interest/i.test(rawLabel);
    return [
      {
        productId: general ? "general-interest" : "prelaunch-item",
        productName: general ? "General Interest" : rawLabel,
        productImage: imageFromDetails,
        size,
        color: colors[0] ? titleCase(colors[0]) : "—",
        quantity: fallbackQty,
        unitPrice: priceBits[0] ?? 0,
      },
    ];
  }

  const expanded: { product: CatalogProduct; quantity: number }[] = [];
  for (const row of matched) {
    if (row.product) expanded.push({ product: row.product, quantity: row.quantity });
  }

  const slots: CatalogProduct[] = [];
  for (const row of expanded) {
    for (let i = 0; i < row.quantity; i += 1) slots.push(row.product);
  }

  const useSlotColors = colors.length === slots.length;
  const useProductColors = colors.length === expanded.length;

  return slots.map((product, index) => {
    const productIndex = expanded.findIndex((row) => row.product.id === product.id);
    let colorRaw = "";
    if (useSlotColors) colorRaw = colors[index] ?? "";
    else if (useProductColors) colorRaw = colors[Math.max(0, productIndex)] ?? "";
    else colorRaw = colors[0] ?? String(lead.preferred_color ?? "");
    const unitPrice =
      (priceBits.length === slots.length ? priceBits[index] : undefined) ??
      (priceBits.length === expanded.length ? priceBits[Math.max(0, productIndex)] : undefined) ??
      parsePriceInr(product.price);
    return {
      productId: product.id,
      productName: product.name,
      productImage: imageFromDetails || product.image,
      size,
      color: pickColor(colorRaw, product),
      quantity: 1,
      unitPrice,
    };
  });
}

async function ensureCustomer(
  sb: SupabaseClient,
  lead: LeadRow,
  customers: { id: string; email: string; phone: string }[],
) {
  const email = (lead.email || `lead-${lead.id.slice(0, 8)}@imported.abcollection.local`)
    .trim()
    .toLowerCase();
  const phone = normalizeMobile(lead.mobile) || lead.mobile.replace(/\D/g, "").slice(-10);
  const existing =
    customers.find((row) => row.email.toLowerCase() === email) ||
    customers.find((row) => row.phone === phone);
  if (existing) return existing.id;

  const now = lead.created_at;
  const id = randomUUID();
  const { error } = await sb.from("customers").insert({
    id,
    email,
    password_hash: IMPORTED_CUSTOMER_PASSWORD,
    full_name: lead.full_name.trim(),
    phone,
    status: "active",
    created_at: now,
    updated_at: now,
  });
  if (error && !/duplicate|unique/i.test(error.message ?? "")) throw error;
  if (error) {
    const { data } = await sb.from("customers").select("id").ilike("email", email).maybeSingle();
    if (data?.id) return String(data.id);
    throw error;
  }
  customers.push({ id, email, phone });
  return id;
}

export async function syncPrelaunchLeadsToOrders() {
  const sb = db();
  const [{ data: leadRows, error: leadError }, { data: productRows, error: productError }] =
    await Promise.all([
      sb.from("prelaunch_leads").select("*").order("created_at", { ascending: true }),
      sb.from("products").select("id,name,price,image,colors"),
    ]);
  if (leadError) throw leadError;
  if (productError) throw productError;
  const leads = (leadRows ?? []) as LeadRow[];
  if (!leads.length) return { imported: 0, skipped: 0 };
  const catalog = (productRows ?? []) as CatalogProduct[];

  const { data: existingOrders, error: orderError } = await sb
    .from("orders")
    .select("id,order_number,invoice_number");
  if (orderError) throw orderError;
  const takenNumbers = new Set(
    (existingOrders ?? []).map((row) => String(row.order_number).toUpperCase()),
  );
  const importedIds = new Set(
    (existingOrders ?? [])
      .map((row) => String(row.invoice_number ?? ""))
      .filter((value) => value.startsWith("LEAD-"))
      .map((value) => value.slice(5)),
  );

  const { data: customerRows, error: customerError } = await sb
    .from("customers")
    .select("id,email,phone");
  if (customerError) throw customerError;
  const customers = (customerRows ?? []).map((row) => ({
    id: String(row.id),
    email: String(row.email),
    phone: String(row.phone),
  }));

  let imported = 0;
  let skipped = 0;
  for (const lead of leads) {
    if (importedIds.has(lead.id)) {
      skipped += 1;
      continue;
    }
    const reservationId = (lead.discount_code || "").trim().toUpperCase();
    const orderNumber =
      reservationId && !takenNumbers.has(reservationId)
        ? reservationId
        : `ABR-${lead.created_at.slice(2, 10).replace(/-/g, "")}-${lead.id.slice(0, 4).toUpperCase()}`;
    const customerId = await ensureCustomer(sb, lead, customers);
    const items = itemsFromPrelaunchLead(lead, catalog);
    const subtotal = items.reduce((sum, item) => sum + item.unitPrice * item.quantity, 0);
    const orderId = randomUUID();
    const phone = normalizeMobile(lead.mobile) || lead.mobile;
    const email = (lead.email || "").trim().toLowerCase() || `${phone}@imported.abcollection.local`;
    const { error: insertOrderError } = await sb.from("orders").insert({
      id: orderId,
      order_number: orderNumber,
      customer_id: customerId,
      customer_name: lead.full_name.trim(),
      customer_email: email,
      customer_phone: phone,
      address_line1: "Address not collected (prelaunch reservation)",
      address_city: lead.city?.trim() || "Not provided",
      address_state: "Not provided",
      address_pincode: "000000",
      subtotal,
      shipping_cost: 0,
      discount: 0,
      total_amount: subtotal,
      payment_status: "pending",
      order_status: "confirmed",
      inventory_state: "none",
      promo_code: reservationId || "PRELAUNCH",
      coupon_discount: 0,
      bundle_discount: 0,
      invoice_number: `LEAD-${lead.id}`,
      payment_method: "prepaid",
      created_at: lead.created_at,
      updated_at: lead.created_at,
    });
    if (insertOrderError) {
      if (/duplicate|unique/i.test(insertOrderError.message ?? "")) {
        skipped += 1;
        continue;
      }
      throw insertOrderError;
    }
    takenNumbers.add(orderNumber);
    importedIds.add(lead.id);
    const { error: itemsError } = await sb.from("order_items").insert(
      items.map((item) => ({
        id: randomUUID(),
        order_id: orderId,
        product_id: item.productId,
        product_name: item.productName,
        product_image: item.productImage,
        size: item.size,
        color: item.color,
        quantity: item.quantity,
        unit_price: item.unitPrice,
        line_total: item.unitPrice * item.quantity,
      })),
    );
    if (itemsError) throw itemsError;
    imported += 1;
  }

  return { imported, skipped };
}
