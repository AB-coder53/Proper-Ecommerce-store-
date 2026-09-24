/**
 * One-shot: copy JSON rows that are missing in live Supabase.
 * Never overwrites existing stock, prices, orders, or other live rows.
 *
 *   npx tsx scripts/sync-json-to-supabase.ts
 */
import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import { existsSync, readFileSync } from "node:fs";
import path from "node:path";

type Counts = { inserted: number; skipped: number };

function loadEnv(filePath: string) {
  if (!existsSync(filePath)) return;
  const text = readFileSync(filePath, "utf8");
  for (const rawLine of text.split(/\r?\n/)) {
    const line = rawLine.trim();
    if (!line || line.startsWith("#")) continue;
    const eq = line.indexOf("=");
    if (eq <= 0) continue;
    const key = line.slice(0, eq).trim();
    let value = line.slice(eq + 1);
    if (
      (value.startsWith('"') && value.endsWith('"')) ||
      (value.startsWith("'") && value.endsWith("'"))
    ) {
      value = value.slice(1, -1);
    }
    if (!(key in process.env)) process.env[key] = value;
  }
}

function readJson<T>(filePath: string): T | null {
  if (!existsSync(filePath)) return null;
  return JSON.parse(readFileSync(filePath, "utf8")) as T;
}

function createServiceClient(): SupabaseClient {
  const url = process.env["SUPABASE_URL"] || process.env["NEXT_PUBLIC_SUPABASE_URL"];
  const key = process.env["SUPABASE_SERVICE_ROLE_KEY"];
  if (!url || !key) {
    throw new Error(
      "SUPABASE_URL / NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY are required.",
    );
  }
  return createClient(url, key, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
}

async function insertMissing(
  sb: SupabaseClient,
  table: string,
  rows: Record<string, unknown>[],
  keyOf: (row: Record<string, unknown>) => string,
  existingKeys: Set<string>,
): Promise<Counts> {
  const missing = rows.filter((row) => !existingKeys.has(keyOf(row)));
  const skipped = rows.length - missing.length;
  if (!missing.length) return { inserted: 0, skipped };

  const { error } = await sb.from(table).insert(missing);
  if (error) {
    throw new Error(`${table} insert failed: ${error.message}`);
  }
  for (const row of missing) existingKeys.add(keyOf(row));
  return { inserted: missing.length, skipped };
}

async function keysFrom(
  sb: SupabaseClient,
  table: string,
  select: string,
  keyOf: (row: Record<string, unknown>) => string,
): Promise<Set<string>> {
  const { data, error } = await sb.from(table).select(select);
  if (error) throw new Error(`${table} select failed: ${error.message}`);
  return new Set((data ?? []).map((row) => keyOf(row as Record<string, unknown>)));
}

function printCounts(label: string, counts: Counts) {
  console.log(`  ${label.padEnd(28)} inserted=${counts.inserted}  skipped=${counts.skipped}`);
}

async function syncCatalog(sb: SupabaseClient, root: string): Promise<Counts> {
  const catalog = readJson<{
    products?: Array<Record<string, unknown>>;
    collections?: Array<Record<string, unknown>>;
  }>(path.join(root, "data", "catalog.json"));
  if (!catalog) {
    console.log("  catalog.json missing — skip");
    return { inserted: 0, skipped: 0 };
  }

  const productRows = (catalog.products ?? []).map((product) => {
    const images = Array.isArray(product.images)
      ? (product.images as string[])
      : [String(product.image ?? "")];
    return {
      id: String(product.id),
      name: String(product.name),
      fabric: String(product.fabric ?? ""),
      image: String(product.image ?? images[0] ?? ""),
      images,
      color_images: product.colorImages ?? [],
      tagline: String(product.tagline ?? ""),
      description: String(product.description ?? ""),
      details: Array.isArray(product.details) ? product.details : [],
      colors: Array.isArray(product.colors) ? product.colors : [],
      sizes: Array.isArray(product.sizes) ? product.sizes : [],
      price: String(product.price ?? ""),
      badge: product.badge ? String(product.badge) : null,
      featured: Boolean(product.featured ?? true),
      sort_order: Number(product.sortOrder ?? 0),
      size_chart: product.sizeChart ? String(product.sizeChart) : null,
      compare_at_price: product.compareAtPrice ? String(product.compareAtPrice) : null,
    };
  });

  const productKeys = await keysFrom(sb, "products", "id", (row) => String(row.id));
  let products: Counts;
  try {
    products = await insertMissing(
      sb,
      "products",
      productRows,
      (row) => String(row.id),
      productKeys,
    );
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    if (!/color_images|compare_at_price|size_chart/.test(message)) throw error;
    const stripped = productRows.map(
      ({ color_images: _c, compare_at_price: _p, size_chart: _s, ...rest }) => rest,
    );
    products = await insertMissing(sb, "products", stripped, (row) => String(row.id), productKeys);
  }
  printCounts("products", products);

  const collectionRows = (catalog.collections ?? []).map((collection) => ({
    id: String(collection.id),
    title: String(collection.title),
    image: String(collection.image ?? ""),
    product_id: collection.productId ? String(collection.productId) : null,
    tint: String(collection.tint ?? "bg-white"),
    sort_order: Number(collection.sortOrder ?? 0),
  }));
  const collectionKeys = await keysFrom(sb, "collections", "id", (row) => String(row.id));
  const collections = await insertMissing(
    sb,
    "collections",
    collectionRows,
    (row) => String(row.id),
    collectionKeys,
  );
  printCounts("collections", collections);

  return {
    inserted: products.inserted + collections.inserted,
    skipped: products.skipped + collections.skipped,
  };
}

async function syncInventory(sb: SupabaseClient, root: string): Promise<Counts> {
  const inventory = readJson<{
    variants?: Array<{
      id?: string;
      productId: string;
      color: string;
      size: string;
      sku: string;
      stock: number;
    }>;
  }>(path.join(root, "data", "inventory.json"));
  if (!inventory) {
    console.log("  inventory.json missing — skip");
    return { inserted: 0, skipped: 0 };
  }

  const variantKey = (row: Record<string, unknown>) =>
    `${String(row.product_id ?? row.productId).toLowerCase()}::${String(row.color).toLowerCase()}::${String(row.size).toLowerCase()}`;
  const existing = await keysFrom(
    sb,
    "product_variants",
    "product_id, color, size, sku",
    variantKey,
  );
  const { data: skuRows, error: skuError } = await sb.from("product_variants").select("id, sku");
  if (skuError) throw new Error(`product_variants sku select failed: ${skuError.message}`);
  const existingSkus = new Set(
    (skuRows ?? []).map((row) => String((row as { sku: string }).sku).toLowerCase()),
  );
  const existingIds = new Set((skuRows ?? []).map((row) => String((row as { id: string }).id)));

  const rows = (inventory.variants ?? []).map((variant) => ({
    ...(variant.id ? { id: variant.id } : {}),
    product_id: variant.productId,
    color: variant.color,
    size: variant.size,
    sku: variant.sku,
    stock: Number(variant.stock ?? 0),
  }));
  const novel = rows.filter((row) => {
    if (existing.has(variantKey(row))) return false;
    if (existingSkus.has(String(row.sku).toLowerCase())) return false;
    if (row.id && existingIds.has(String(row.id))) return false;
    return true;
  });
  const skipped = rows.length - novel.length;
  if (!novel.length) {
    const counts = { inserted: 0, skipped };
    printCounts("product_variants", counts);
    return counts;
  }

  const counts = await insertMissing(sb, "product_variants", novel, variantKey, existing);
  counts.skipped += skipped;
  printCounts("product_variants", counts);
  return counts;
}

async function syncShipping(sb: SupabaseClient, root: string): Promise<Counts> {
  const settings = readJson<{
    enabled?: boolean;
    processingMinDays?: number;
    processingMaxDays?: number;
    handlingDays?: number;
    shippingMinDays?: number;
    shippingMaxDays?: number;
    businessDaysOnly?: boolean;
    productRules?: unknown;
  }>(path.join(root, "data", "shipping-settings.json"));

  const { data, error } = await sb
    .from("shipping_settings")
    .select("id")
    .eq("id", "default")
    .maybeSingle();
  if (error) throw new Error(`shipping_settings select failed: ${error.message}`);
  if (data) {
    printCounts("shipping_settings", { inserted: 0, skipped: 1 });
    return { inserted: 0, skipped: 1 };
  }
  if (!settings) {
    printCounts("shipping_settings", { inserted: 0, skipped: 0 });
    return { inserted: 0, skipped: 0 };
  }

  const { error: insertError } = await sb.from("shipping_settings").insert({
    id: "default",
    enabled: settings.enabled ?? true,
    processing_min_days: settings.processingMinDays ?? 2,
    processing_max_days: settings.processingMaxDays ?? 3,
    handling_days: settings.handlingDays ?? 0,
    shipping_min_days: settings.shippingMinDays ?? 5,
    shipping_max_days: settings.shippingMaxDays ?? 7,
    business_days_only: settings.businessDaysOnly ?? true,
    product_rules: settings.productRules ?? [],
  });
  if (insertError) throw new Error(`shipping_settings insert failed: ${insertError.message}`);
  printCounts("shipping_settings", { inserted: 1, skipped: 0 });
  return { inserted: 1, skipped: 0 };
}

async function syncBundles(root: string): Promise<Counts> {
  const file = readJson<{ bundles?: unknown[] }>(path.join(root, "data", "bundle-offers.json"));
  const count = file?.bundles?.length ?? 0;
  printCounts("bundle_offers", { inserted: 0, skipped: count });
  return { inserted: 0, skipped: count };
}

async function syncOptionalCommerce(sb: SupabaseClient, root: string): Promise<Counts> {
  const store = readJson<{
    customers?: Array<Record<string, unknown>>;
    addresses?: Array<Record<string, unknown>>;
    wishlist?: Array<Record<string, unknown>>;
    cart?: Array<Record<string, unknown>>;
    orders?: Array<Record<string, unknown>>;
    orderItems?: Array<Record<string, unknown>>;
  }>(path.join(root, "data", "commerce.json"));
  if (!store) {
    console.log("  commerce.json missing — skip");
    return { inserted: 0, skipped: 0 };
  }

  const pick = (row: Record<string, unknown>, ...keys: string[]) => {
    for (const key of keys) {
      if (row[key] !== undefined && row[key] !== null) return row[key];
    }
    return null;
  };

  const customers = (store.customers ?? []).map((row) => ({
    id: String(pick(row, "id")),
    email: String(pick(row, "email")),
    password_hash: String(pick(row, "password_hash", "passwordHash")),
    full_name: String(pick(row, "full_name", "fullName") ?? ""),
    phone: String(pick(row, "phone") ?? ""),
    alternate_phone: pick(row, "alternate_phone", "alternatePhone"),
    status: String(pick(row, "status") ?? "active"),
  }));
  const customerKeys = await keysFrom(sb, "customers", "id", (row) => String(row.id));
  const customerCounts = await insertMissing(
    sb,
    "customers",
    customers,
    (row) => String(row.id),
    customerKeys,
  );
  printCounts("customers", customerCounts);

  const addresses = (store.addresses ?? []).map((row) => ({
    id: String(pick(row, "id")),
    customer_id: String(pick(row, "customer_id", "customerId")),
    label: String(pick(row, "label") ?? "Home"),
    line1: String(pick(row, "line1")),
    line2: pick(row, "line2"),
    city: String(pick(row, "city")),
    state: String(pick(row, "state")),
    pincode: String(pick(row, "pincode")),
    is_default: Boolean(pick(row, "is_default", "isDefault")),
  }));
  const addressKeys = await keysFrom(sb, "customer_addresses", "id", (row) => String(row.id));
  const addressCounts = await insertMissing(
    sb,
    "customer_addresses",
    addresses,
    (row) => String(row.id),
    addressKeys,
  );
  printCounts("customer_addresses", addressCounts);

  const wishlist = (store.wishlist ?? []).map((row) => ({
    id: String(pick(row, "id")),
    customer_id: String(pick(row, "customer_id", "customerId")),
    product_id: String(pick(row, "product_id", "productId")),
  }));
  const wishlistKeys = await keysFrom(sb, "wishlist_items", "id", (row) => String(row.id));
  const wishlistCounts = await insertMissing(
    sb,
    "wishlist_items",
    wishlist,
    (row) => String(row.id),
    wishlistKeys,
  );
  printCounts("wishlist_items", wishlistCounts);

  const cart = (store.cart ?? []).map((row) => ({
    id: String(pick(row, "id")),
    customer_id: String(pick(row, "customer_id", "customerId")),
    product_id: String(pick(row, "product_id", "productId")),
    size: String(pick(row, "size")),
    color: String(pick(row, "color")),
    quantity: Number(pick(row, "quantity") ?? 1),
  }));
  const cartKeys = await keysFrom(sb, "cart_items", "id", (row) => String(row.id));
  const cartCounts = await insertMissing(sb, "cart_items", cart, (row) => String(row.id), cartKeys);
  printCounts("cart_items", cartCounts);

  const orders = (store.orders ?? []).map((row) => ({
    id: String(pick(row, "id")),
    order_number: String(pick(row, "order_number", "orderNumber")),
    customer_id: String(pick(row, "customer_id", "customerId")),
    customer_name: String(pick(row, "customer_name", "customerName") ?? ""),
    customer_email: String(pick(row, "customer_email", "customerEmail") ?? ""),
    customer_phone: String(pick(row, "customer_phone", "customerPhone") ?? ""),
    alternate_phone: pick(row, "alternate_phone", "alternatePhone"),
    address_line1: String(pick(row, "address_line1", "addressLine1") ?? ""),
    address_line2: pick(row, "address_line2", "addressLine2"),
    address_city: String(pick(row, "address_city", "addressCity") ?? ""),
    address_state: String(pick(row, "address_state", "addressState") ?? ""),
    address_pincode: String(pick(row, "address_pincode", "addressPincode") ?? ""),
    subtotal: Number(pick(row, "subtotal") ?? 0),
    shipping_cost: Number(pick(row, "shipping_cost", "shippingCost") ?? 0),
    discount: Number(pick(row, "discount") ?? 0),
    total_amount: Number(pick(row, "total_amount", "totalAmount") ?? 0),
    payment_status: String(pick(row, "payment_status", "paymentStatus") ?? "pending"),
    order_status: String(pick(row, "order_status", "orderStatus") ?? "placed"),
  }));
  const orderKeys = await keysFrom(sb, "orders", "id", (row) => String(row.id));
  const orderCounts = await insertMissing(sb, "orders", orders, (row) => String(row.id), orderKeys);
  printCounts("orders", orderCounts);

  const orderItems = (store.orderItems ?? []).map((row) => ({
    id: String(pick(row, "id")),
    order_id: String(pick(row, "order_id", "orderId")),
    product_id: String(pick(row, "product_id", "productId")),
    product_name: String(pick(row, "product_name", "productName") ?? ""),
    product_image: pick(row, "product_image", "productImage"),
    size: String(pick(row, "size") ?? ""),
    color: String(pick(row, "color") ?? ""),
    quantity: Number(pick(row, "quantity") ?? 1),
    unit_price: Number(pick(row, "unit_price", "unitPrice") ?? 0),
    line_total: Number(pick(row, "line_total", "lineTotal") ?? 0),
  }));
  const itemKeys = await keysFrom(sb, "order_items", "id", (row) => String(row.id));
  const itemCounts = await insertMissing(
    sb,
    "order_items",
    orderItems,
    (row) => String(row.id),
    itemKeys,
  );
  printCounts("order_items", itemCounts);

  return {
    inserted:
      customerCounts.inserted +
      addressCounts.inserted +
      wishlistCounts.inserted +
      cartCounts.inserted +
      orderCounts.inserted +
      itemCounts.inserted,
    skipped:
      customerCounts.skipped +
      addressCounts.skipped +
      wishlistCounts.skipped +
      cartCounts.skipped +
      orderCounts.skipped +
      itemCounts.skipped,
  };
}

async function syncOptionalPromotions(sb: SupabaseClient, root: string): Promise<Counts> {
  const store = readJson<{
    badges?: Array<Record<string, unknown>>;
    assignments?: Array<Record<string, unknown>>;
    coupons?: Array<Record<string, unknown>>;
    redemptions?: Array<Record<string, unknown>>;
  }>(path.join(root, "data", "promotions.json"));
  if (!store) {
    console.log("  promotions.json missing — skip");
    return { inserted: 0, skipped: 0 };
  }

  const pick = (row: Record<string, unknown>, ...keys: string[]) => {
    for (const key of keys) {
      if (row[key] !== undefined && row[key] !== null) return row[key];
    }
    return null;
  };

  const badges = (store.badges ?? []).map((row) => ({
    id: String(pick(row, "id")),
    name: String(pick(row, "name")),
    label: String(pick(row, "label")),
    active: Boolean(pick(row, "active") ?? true),
    sort_order: Number(pick(row, "sort_order", "sortOrder") ?? 0),
    tone: String(pick(row, "tone") ?? "default"),
  }));
  const badgeKeys = await keysFrom(sb, "product_badges", "id", (row) => String(row.id));
  const badgeCounts = await insertMissing(
    sb,
    "product_badges",
    badges,
    (row) => String(row.id),
    badgeKeys,
  );
  printCounts("product_badges", badgeCounts);

  const assignments = (store.assignments ?? []).map((row) => ({
    product_id: String(pick(row, "product_id", "productId")),
    badge_id: String(pick(row, "badge_id", "badgeId")),
  }));
  const assignmentKey = (row: Record<string, unknown>) => `${row.product_id}::${row.badge_id}`;
  const assignmentKeys = await keysFrom(
    sb,
    "product_badge_assignments",
    "product_id, badge_id",
    assignmentKey,
  );
  const assignmentCounts = await insertMissing(
    sb,
    "product_badge_assignments",
    assignments,
    assignmentKey,
    assignmentKeys,
  );
  printCounts("product_badge_assignments", assignmentCounts);

  const coupons = (store.coupons ?? []).map((row) => ({
    ...(pick(row, "id") ? { id: String(pick(row, "id")) } : {}),
    code: String(pick(row, "code")),
    name: String(pick(row, "name")),
    type: String(pick(row, "type")),
    value: Number(pick(row, "value") ?? 0),
    active: Boolean(pick(row, "active") ?? true),
    starts_at: pick(row, "starts_at", "startsAt") || null,
    ends_at: pick(row, "ends_at", "endsAt") || null,
    min_order_value: Number(pick(row, "min_order_value", "minOrderValue") ?? 0),
    max_discount: pick(row, "max_discount", "maxDiscount"),
    usage_limit: pick(row, "usage_limit", "usageLimit"),
    usage_per_customer: pick(row, "usage_per_customer", "usagePerCustomer"),
    product_ids: pick(row, "product_ids", "productIds") ?? [],
  }));
  const couponKeys = await keysFrom(sb, "coupons", "id", (row) => String(row.id ?? row.code));
  const couponCounts = await insertMissing(
    sb,
    "coupons",
    coupons.filter((row) => row.id),
    (row) => String(row.id),
    couponKeys,
  );
  printCounts("coupons", couponCounts);

  const redemptions = (store.redemptions ?? []).map((row) => ({
    id: String(pick(row, "id")),
    coupon_id: String(pick(row, "coupon_id", "couponId")),
    order_id: String(pick(row, "order_id", "orderId")),
    customer_id: pick(row, "customer_id", "customerId"),
    code: String(pick(row, "code")),
    discount: Number(pick(row, "discount") ?? 0),
  }));
  const redemptionKeys = await keysFrom(sb, "coupon_redemptions", "id", (row) => String(row.id));
  const redemptionCounts = await insertMissing(
    sb,
    "coupon_redemptions",
    redemptions,
    (row) => String(row.id),
    redemptionKeys,
  );
  printCounts("coupon_redemptions", redemptionCounts);

  return {
    inserted:
      badgeCounts.inserted +
      assignmentCounts.inserted +
      couponCounts.inserted +
      redemptionCounts.inserted,
    skipped:
      badgeCounts.skipped +
      assignmentCounts.skipped +
      couponCounts.skipped +
      redemptionCounts.skipped,
  };
}

async function syncOptionalReviews(sb: SupabaseClient, root: string): Promise<Counts> {
  const store = readJson<{ reviews?: Array<Record<string, unknown>> }>(
    path.join(root, "data", "reviews.json"),
  );
  if (!store) {
    console.log("  reviews.json missing — skip");
    return { inserted: 0, skipped: 0 };
  }

  const pick = (row: Record<string, unknown>, ...keys: string[]) => {
    for (const key of keys) {
      if (row[key] !== undefined && row[key] !== null) return row[key];
    }
    return null;
  };

  const rows = (store.reviews ?? []).map((row) => ({
    id: String(pick(row, "id")),
    product_id: String(pick(row, "product_id", "productId")),
    customer_id: String(pick(row, "customer_id", "customerId")),
    order_id: String(pick(row, "order_id", "orderId")),
    variant_id: pick(row, "variant_id", "variantId"),
    color: pick(row, "color"),
    size: pick(row, "size"),
    rating: Number(pick(row, "rating") ?? 0),
    body: String(pick(row, "body") ?? ""),
    customer_name: pick(row, "customer_name", "customerName"),
    customer_email: pick(row, "customer_email", "customerEmail"),
    order_number: pick(row, "order_number", "orderNumber"),
    status: String(pick(row, "status") ?? "pending"),
    verified_purchase: Boolean(pick(row, "verified_purchase", "verifiedPurchase") ?? true),
    deleted_at: pick(row, "deleted_at", "deletedAt"),
  }));
  const keys = await keysFrom(sb, "product_reviews", "id", (row) => String(row.id));
  const counts = await insertMissing(sb, "product_reviews", rows, (row) => String(row.id), keys);
  printCounts("product_reviews", counts);
  return counts;
}

async function syncOptionalNotifications(sb: SupabaseClient, root: string): Promise<Counts> {
  const store = readJson<{ notifications?: Array<Record<string, unknown>> }>(
    path.join(root, "data", "order-notifications.json"),
  );
  if (!store) {
    console.log("  order-notifications.json missing — skip");
    return { inserted: 0, skipped: 0 };
  }

  const pick = (row: Record<string, unknown>, ...keys: string[]) => {
    for (const key of keys) {
      if (row[key] !== undefined && row[key] !== null) return row[key];
    }
    return null;
  };

  const rows = (store.notifications ?? []).map((row) => ({
    id: String(pick(row, "id")),
    order_id: String(pick(row, "order_id", "orderId")),
    customer_id: pick(row, "customer_id", "customerId"),
    event_type: String(pick(row, "event_type", "eventType")),
    channel: String(pick(row, "channel")),
    status: String(pick(row, "status") ?? "pending"),
    provider_message_id: pick(row, "provider_message_id", "providerMessageId"),
    error: pick(row, "error"),
    sent_at: pick(row, "sent_at", "sentAt"),
  }));
  const keys = await keysFrom(sb, "order_notifications", "id", (row) => String(row.id));
  const counts = await insertMissing(
    sb,
    "order_notifications",
    rows,
    (row) => String(row.id),
    keys,
  );
  printCounts("order_notifications", counts);
  return counts;
}

async function main() {
  const root = process.cwd();
  loadEnv(path.join(root, ".env"));
  loadEnv(path.join(root, ".env.local"));

  const sb = createServiceClient();
  console.log("Syncing missing JSON rows into Supabase (insert-only)...");

  const totals: Counts[] = [];
  totals.push(await syncCatalog(sb, root));
  totals.push(await syncInventory(sb, root));
  totals.push(await syncShipping(sb, root));
  totals.push(await syncBundles(root));
  totals.push(await syncOptionalCommerce(sb, root));
  totals.push(await syncOptionalPromotions(sb, root));
  totals.push(await syncOptionalReviews(sb, root));
  totals.push(await syncOptionalNotifications(sb, root));

  const inserted = totals.reduce((sum, row) => sum + row.inserted, 0);
  const skipped = totals.reduce((sum, row) => sum + row.skipped, 0);
  console.log(`\nDone. inserted=${inserted}  skipped=${skipped}`);
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : error);
  process.exit(1);
});
