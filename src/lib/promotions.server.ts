import "server-only";

import {
  computeCouponDiscount,
  couponSchema,
  couponStatus,
  productBadgeSchema,
  type Coupon,
  type CouponQuote,
  type ProductBadge,
} from "@/lib/promotions";
import { formatInr } from "@/lib/price";
import { getSupabaseReadClient, getSupabaseWriteClient } from "@/lib/supabase-catalog.server";
import type { SupabaseClient } from "@supabase/supabase-js";

function db(): SupabaseClient {
  return getSupabaseWriteClient() as unknown as SupabaseClient;
}

function readDb(): SupabaseClient {
  try {
    return getSupabaseReadClient() as unknown as SupabaseClient;
  } catch {
    return db();
  }
}

function withDb<T>(dbFn: () => Promise<T>): Promise<T> {
  return dbFn();
}

function mapBadge(row: Record<string, unknown>): ProductBadge {
  return productBadgeSchema.parse({
    id: row["id"],
    name: row["name"],
    label: row["label"],
    active: row["active"],
    sortOrder: row["sort_order"] ?? row["sortOrder"] ?? 0,
    tone: row["tone"] ?? "default",
    createdAt: row["created_at"] ?? row["createdAt"],
    updatedAt: row["updated_at"] ?? row["updatedAt"],
  });
}

function mapCoupon(row: Record<string, unknown>, usage = 0): Coupon {
  return couponSchema.parse({
    id: String(row["id"]),
    code: String(row["code"]),
    name: String(row["name"]),
    type: row["type"],
    value: Number(row["value"]),
    active: Boolean(row["active"]),
    startsAt: String(row["starts_at"] ?? row["startsAt"] ?? ""),
    endsAt: String(row["ends_at"] ?? row["endsAt"] ?? ""),
    minOrderValue: Number(row["min_order_value"] ?? row["minOrderValue"] ?? 0),
    maxDiscount:
      row["max_discount"] == null && row["maxDiscount"] == null
        ? null
        : Number(row["max_discount"] ?? row["maxDiscount"]),
    usageLimit:
      row["usage_limit"] == null && row["usageLimit"] == null
        ? null
        : Number(row["usage_limit"] ?? row["usageLimit"]),
    usagePerCustomer:
      row["usage_per_customer"] == null && row["usagePerCustomer"] == null
        ? null
        : Number(row["usage_per_customer"] ?? row["usagePerCustomer"]),
    productIds:
      (row["product_ids"] as string[] | undefined) ?? (row["productIds"] as string[]) ?? [],
    currentUsage: usage,
    createdAt: String(row["created_at"] ?? row["createdAt"] ?? ""),
    updatedAt: String(row["updated_at"] ?? row["updatedAt"] ?? ""),
  });
}

export async function listBadges(): Promise<ProductBadge[]> {
  return withDb(async () => {
    const { data, error } = await readDb()
      .from("product_badges")
      .select("*")
      .order("sort_order", { ascending: true });
    if (error) throw error;
    return (data ?? []).map((row) => mapBadge(row as Record<string, unknown>));
  });
}

export async function saveBadge(input: ProductBadge, mode: "create" | "update") {
  const parsed = productBadgeSchema.parse(input);
  return withDb(async () => {
    const payload = {
      id: parsed.id,
      name: parsed.name,
      label: parsed.label,
      active: parsed.active,
      sort_order: parsed.sortOrder,
      tone: parsed.tone,
    };
    const query =
      mode === "create"
        ? db().from("product_badges").insert(payload).select("*").single()
        : db().from("product_badges").update(payload).eq("id", parsed.id).select("*").single();
    const { data, error } = await query;
    if (error || !data) throw error ?? new Error("Could not save badge");
    return mapBadge(data as Record<string, unknown>);
  });
}

export async function deleteBadge(id: string) {
  await withDb(async () => {
    await db().from("product_badge_assignments").delete().eq("badge_id", id);
    const { error } = await db().from("product_badges").delete().eq("id", id);
    if (error) throw error;
  });
}

export async function listBadgeAssignments() {
  return withDb(async () => {
    const { data, error } = await readDb().from("product_badge_assignments").select("*");
    if (error) throw error;
    return (data ?? []).map((row) => ({
      productId: String((row as { product_id: string }).product_id),
      badgeId: String((row as { badge_id: string }).badge_id),
    }));
  });
}

export async function setProductBadges(productId: string, badgeIds: string[]) {
  const unique = [...new Set(badgeIds)];
  await withDb(async () => {
    await db().from("product_badge_assignments").delete().eq("product_id", productId);
    if (!unique.length) return;
    const { error } = await db()
      .from("product_badge_assignments")
      .insert(unique.map((badgeId) => ({ product_id: productId, badge_id: badgeId })));
    if (error) throw new Error(error.message);
  });
}

export async function attachProductBadges<T extends { id: string }>(products: T[]) {
  if (!products.length)
    return products.map((product) => ({ ...product, badges: [] as ProductBadge[] }));
  const [badges, assignments] = await Promise.all([listBadges(), listBadgeAssignments()]);
  const active = new Map(badges.filter((row) => row.active).map((row) => [row.id, row]));
  return products.map((product) => ({
    ...product,
    badges: assignments
      .filter((row) => row.productId === product.id)
      .map((row) => active.get(row.badgeId))
      .filter((row): row is ProductBadge => Boolean(row))
      .sort((a, b) => a.sortOrder - b.sortOrder),
    badgeIds: assignments.filter((row) => row.productId === product.id).map((row) => row.badgeId),
  }));
}

async function usageByCoupon(): Promise<Map<string, number>> {
  return withDb(async () => {
    const { data, error } = await db().from("coupon_redemptions").select("coupon_id");
    if (error) throw error;
    const map = new Map<string, number>();
    for (const row of data ?? []) {
      const id = String((row as { coupon_id: string }).coupon_id);
      map.set(id, (map.get(id) ?? 0) + 1);
    }
    return map;
  });
}

export async function listCoupons(): Promise<Coupon[]> {
  const usage = await usageByCoupon();
  return withDb(async () => {
    const { data, error } = await db()
      .from("coupons")
      .select("*")
      .order("created_at", { ascending: false });
    if (error) throw error;
    return (data ?? []).map((row) => {
      const mapped = mapCoupon(row as Record<string, unknown>);
      return { ...mapped, currentUsage: usage.get(mapped.id ?? "") ?? 0 };
    });
  });
}

export async function saveCoupon(input: Coupon, mode: "create" | "update") {
  const parsed = couponSchema.parse(input);
  return withDb(async () => {
    const payload = {
      code: parsed.code.toUpperCase(),
      name: parsed.name,
      type: parsed.type,
      value: parsed.value,
      active: parsed.active,
      starts_at: parsed.startsAt || null,
      ends_at: parsed.endsAt || null,
      min_order_value: parsed.minOrderValue,
      max_discount: parsed.maxDiscount || null,
      usage_limit: parsed.usageLimit || null,
      usage_per_customer: parsed.usagePerCustomer || null,
      product_ids: parsed.productIds,
    };
    const query =
      mode === "create"
        ? db().from("coupons").insert(payload).select("*").single()
        : db().from("coupons").update(payload).eq("id", parsed.id).select("*").single();
    const { data, error } = await query;
    if (error || !data) throw error ?? new Error("Could not save coupon");
    return mapCoupon(data as Record<string, unknown>);
  });
}

export async function deleteCoupon(id: string) {
  await withDb(async () => {
    const { error } = await db().from("coupons").delete().eq("id", id);
    if (error) throw error;
  });
}

export async function quoteCoupon(input: {
  code?: string | undefined;
  customerId?: string | undefined;
  lines: { productId: string; unitPrice: number; quantity: number }[];
}): Promise<CouponQuote> {
  const code = input.code?.trim().toUpperCase() ?? "";
  if (!code) return { ok: true, code: "", discount: 0 };
  const coupons = await listCoupons();
  const coupon = coupons.find((row) => row.code.toUpperCase() === code);
  if (!coupon) return { ok: false, code, discount: 0, error: "This coupon code is not valid." };
  const status = couponStatus(coupon);
  if (status !== "active") {
    const message =
      status === "expired"
        ? "This coupon has expired."
        : status === "scheduled"
          ? "This coupon is not active yet."
          : status === "exhausted"
            ? "This coupon has reached its usage limit."
            : "This coupon is currently inactive.";
    return { ok: false, code, discount: 0, error: message, status, couponId: coupon.id };
  }
  const cartTotal = input.lines.reduce((sum, line) => sum + line.unitPrice * line.quantity, 0);
  if (coupon.minOrderValue > 0 && cartTotal < coupon.minOrderValue) {
    return {
      ok: false,
      code,
      discount: 0,
      couponId: coupon.id,
      error: `This coupon requires a minimum order of ${formatInr(coupon.minOrderValue)}.`,
    };
  }
  if (coupon.usagePerCustomer && coupon.usagePerCustomer > 0 && input.customerId) {
    const used = await customerCouponUsage(coupon.id!, input.customerId);
    if (used >= coupon.usagePerCustomer) {
      return {
        ok: false,
        code,
        discount: 0,
        couponId: coupon.id,
        error: "You have already used this coupon the maximum number of times.",
      };
    }
  }
  const { amount } = computeCouponDiscount(coupon, input.lines);
  if (amount <= 0) {
    return {
      ok: false,
      code,
      discount: 0,
      couponId: coupon.id,
      error: "This coupon does not apply to the items in your cart.",
    };
  }
  return { ok: true, code, discount: amount, couponId: coupon.id, status };
}

async function customerCouponUsage(couponId: string, customerId: string) {
  return withDb(async () => {
    const { count, error } = await db()
      .from("coupon_redemptions")
      .select("id", { count: "exact", head: true })
      .eq("coupon_id", couponId)
      .eq("customer_id", customerId);
    if (error) throw error;
    return count ?? 0;
  });
}

export async function recordCouponRedemption(input: {
  couponId: string;
  orderId: string;
  customerId?: string | null;
  code: string;
  discount: number;
}) {
  await withDb(async () => {
    const { error } = await db()
      .from("coupon_redemptions")
      .insert({
        coupon_id: input.couponId,
        order_id: input.orderId,
        customer_id: input.customerId ?? null,
        code: input.code,
        discount: input.discount,
      });
    if (error && /duplicate|unique/i.test(error.message)) return;
    if (error) throw error;
  });
}

export async function listCouponRedemptions() {
  return withDb(async () => {
    const { data, error } = await db().from("coupon_redemptions").select("*");
    if (error) throw error;
    return (data ?? []).map((row) => ({
      couponId: String((row as { coupon_id: string }).coupon_id),
      orderId: String((row as { order_id: string }).order_id),
      code: String((row as { code: string }).code),
      discount: Number((row as { discount: number }).discount ?? 0),
    }));
  });
}
