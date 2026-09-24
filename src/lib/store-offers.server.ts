import "server-only";

import { cache } from "react";
import { revalidatePath, revalidateTag, unstable_cache } from "next/cache";

import { getProducts } from "@/lib/catalog.server";
import {
  bundleOfferSchema,
  displayProductIds,
  isBundleOfferActive,
  toBundleOfferView,
  type BundleOffer,
  type BundleOfferView,
} from "@/lib/store-offers";
import { getSupabaseReadClient, getSupabaseWriteClient } from "@/lib/supabase-catalog.server";

type BundleRow = {
  id: string;
  title: string;
  product_ids: string[] | null;
  show_on_product_ids: string[] | null;
  bundle_price: number;
  starts_at: string | null;
  ends_at: string | null;
  active: boolean;
  deleted_at: string | null;
  sort_order: number;
};

function mapRow(row: BundleRow): BundleOffer {
  return bundleOfferSchema.parse({
    id: row.id,
    title: row.title,
    productIds: row.product_ids ?? [],
    showOnProductIds: row.show_on_product_ids ?? [],
    pricingType:
      (row as BundleRow & { pricing_type?: string }).pricing_type === "percent"
        ? "percent"
        : "fixed",
    bundlePrice: row.bundle_price,
    discountPercent: Number(
      (row as BundleRow & { discount_percent?: number }).discount_percent ?? 0,
    ),
    startsAt: row.starts_at ?? "",
    endsAt: row.ends_at ?? "",
    active: row.active,
    deletedAt: row.deleted_at,
    sortOrder: row.sort_order,
  });
}

function toInsert(offer: BundleOffer) {
  return {
    id: offer.id,
    title: offer.title,
    product_ids: offer.productIds,
    show_on_product_ids: offer.showOnProductIds,
    pricing_type: offer.pricingType ?? "fixed",
    bundle_price: offer.bundlePrice,
    discount_percent: offer.discountPercent ?? 0,
    starts_at: offer.startsAt || null,
    ends_at: offer.endsAt || null,
    active: offer.active,
    deleted_at: offer.deletedAt ?? null,
    sort_order: offer.sortOrder,
  };
}

async function loadBundles(): Promise<BundleOffer[]> {
  const supabase = getSupabaseReadClient();
  const { data, error } = await supabase
    .from("bundle_offers" as never)
    .select("*")
    .order("sort_order", { ascending: true });
  if (error) throw error;
  return ((data ?? []) as BundleRow[]).map(mapRow);
}

const BUNDLES_CACHE_TAG = "bundles";

export const getBundleOffers = cache(
  unstable_cache(loadBundles, ["bundle-offers"], {
    revalidate: 60,
    tags: [BUNDLES_CACHE_TAG],
  }),
);

export async function getBundleOfferById(id: string) {
  return (await getBundleOffers()).find((offer) => offer.id === id && !offer.deletedAt);
}

export async function getActiveBundleViews(): Promise<BundleOfferView[]> {
  const [offers, products] = await Promise.all([getBundleOffers(), getProducts()]);
  return offers
    .filter((offer) => isBundleOfferActive(offer))
    .sort((a, b) => a.sortOrder - b.sortOrder || a.title.localeCompare(b.title))
    .map((offer) => toBundleOfferView(offer, products))
    .filter((view): view is BundleOfferView => view != null);
}

export async function getActiveBundleViewsForProduct(
  productId: string,
): Promise<BundleOfferView[]> {
  const [offers, products] = await Promise.all([getBundleOffers(), getProducts()]);
  return offers
    .filter((offer) => isBundleOfferActive(offer) && displayProductIds(offer).includes(productId))
    .sort((a, b) => a.sortOrder - b.sortOrder || a.title.localeCompare(b.title))
    .map((offer) => toBundleOfferView(offer, products))
    .filter((view): view is BundleOfferView => view != null);
}

function invalidateBundles() {
  revalidateTag(BUNDLES_CACHE_TAG);
  revalidatePath("/", "layout");
  revalidatePath("/collection");
  revalidatePath("/admin/bundles");
}

export async function saveBundleOffer(offer: BundleOffer, mode: "create" | "update") {
  const parsed = bundleOfferSchema.parse(offer);
  const products = await getProducts();
  for (const id of parsed.productIds) {
    if (!products.some((product) => product.id === id)) {
      throw new Error(`Unknown product in bundle: ${id}`);
    }
  }
  if (parsed.pricingType === "percent" && parsed.discountPercent < 1) {
    throw new Error("Enter a bundle discount percent.");
  }
  if (parsed.pricingType === "fixed" && parsed.bundlePrice < 1) {
    throw new Error("Enter a bundle price.");
  }

  const supabase = getSupabaseWriteClient();
  const payload = toInsert(parsed);
  const query =
    mode === "create"
      ? supabase
          .from("bundle_offers" as never)
          .insert(payload as never)
          .select("*")
          .single()
      : supabase
          .from("bundle_offers" as never)
          .update(payload as never)
          .eq("id", parsed.id)
          .select("*")
          .single();
  const { data, error } = await query;
  if (error && /pricing_type|discount_percent/.test(error.message)) {
    const columnFallback = {
      id: payload.id,
      title: payload.title,
      product_ids: payload.product_ids,
      show_on_product_ids: payload.show_on_product_ids,
      bundle_price: parsed.pricingType === "percent" ? 0 : payload.bundle_price,
      starts_at: payload.starts_at,
      ends_at: payload.ends_at,
      active: payload.active,
      deleted_at: payload.deleted_at,
      sort_order: payload.sort_order,
    };
    const retry =
      mode === "create"
        ? supabase
            .from("bundle_offers" as never)
            .insert(columnFallback as never)
            .select("*")
            .single()
        : supabase
            .from("bundle_offers" as never)
            .update(columnFallback as never)
            .eq("id", parsed.id)
            .select("*")
            .single();
    const retried = (await retry) as {
      data: BundleRow | null;
      error: { message: string } | null;
    };
    if (retried.error || !retried.data) throw retried.error ?? new Error("Could not save bundle");
    invalidateBundles();
    return mapRow(retried.data);
  }
  if (error || !data) throw error ?? new Error("Could not save bundle");
  invalidateBundles();
  return mapRow(data as BundleRow);
}

export async function deleteBundleOffer(id: string) {
  const now = new Date().toISOString();
  const supabase = getSupabaseWriteClient();
  const { error } = await supabase
    .from("bundle_offers" as never)
    .update({ deleted_at: now, active: false } as never)
    .eq("id", id);
  if (error) throw error;
  invalidateBundles();
}
