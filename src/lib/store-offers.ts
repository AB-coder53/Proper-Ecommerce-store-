import { z } from "zod";

import type { Product } from "@/lib/catalog-types";
import { productHasPurchasableStock, variantHasStock } from "@/lib/inventory";
import { formatInr, parsePriceInr } from "@/lib/price";

export const bundleOfferSchema = z.object({
  id: z
    .string()
    .trim()
    .min(2)
    .max(80)
    .regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/, "Use lowercase slug ids like summer-3-pack"),
  title: z.string().trim().min(2).max(120),
  productIds: z.array(z.string().trim().min(1).max(80)).min(2).max(12),
  productColors: z.array(z.string().trim().max(40)).max(12).default([]),
  showOnProductIds: z.array(z.string().trim().min(1).max(80)).max(20).default([]),
  pricingType: z.enum(["fixed", "percent"]).default("fixed"),
  bundlePrice: z.number().int().min(0).max(10_000_000).default(0),
  discountPercent: z.number().int().min(0).max(90).default(0),
  startsAt: z.string().trim().max(40).optional().or(z.literal("")),
  endsAt: z.string().trim().max(40).optional().or(z.literal("")),
  active: z.boolean().default(true),
  deletedAt: z.string().trim().max(40).nullable().optional(),
  sortOrder: z.number().int().min(0).max(9999).default(0),
});

export type BundleOffer = z.infer<typeof bundleOfferSchema>;

export type BundleOfferView = {
  id: string;
  title: string;
  items: { id: string; name: string; color: string; priceLabel: string; price: number }[];
  individualTotal: number;
  individualTotalLabel: string;
  bundlePrice: number;
  bundlePriceLabel: string;
  savings: number;
  savingsLabel: string;
  savingsPercent: number;
};

export function displayProductIds(offer: BundleOffer): string[] {
  return offer.showOnProductIds.length > 0 ? offer.showOnProductIds : offer.productIds;
}

export function bundleItemColor(offer: BundleOffer, index: number) {
  return offer.productColors[index]?.trim() ?? "";
}

/** Stored beside the product id so a tee can be pinned to one colour without a new column. */
export function encodeBundleProductRef(productId: string, color: string) {
  const trimmed = color.trim();
  return trimmed ? `${productId}@${trimmed}` : productId;
}

export function decodeBundleProductRef(entry: string) {
  const at = entry.indexOf("@");
  if (at <= 0) return { productId: entry, color: "" };
  return { productId: entry.slice(0, at), color: entry.slice(at + 1) };
}

export function cartCoversBundleItems(
  items: { id: string; color?: string }[],
  lines: { productId: string; color?: string; quantity?: number }[],
) {
  const pool = lines.map((line) => ({
    productId: line.productId,
    color: line.color ?? "",
    quantity: Math.max(0, line.quantity ?? 1),
  }));
  for (const item of items) {
    const index = pool.findIndex(
      (line) =>
        line.quantity > 0 &&
        line.productId === item.id &&
        (!item.color || line.color === item.color),
    );
    const match = index >= 0 ? pool[index] : undefined;
    if (!match) return false;
    match.quantity -= 1;
  }
  return true;
}

function bundleColorInStock(product: Product, color: string) {
  if (!color) return productHasPurchasableStock(product);
  if (!product.colors.includes(color)) return false;
  if (!product.variants?.length) return true;
  return product.sizes.some((size) => variantHasStock(product, color, size));
}

export function bestApplicableBundle(
  offers: BundleOffer[],
  products: Product[],
  cartLines: { productId: string; color?: string; quantity?: number }[],
  now = new Date(),
) {
  let best: { offer: BundleOffer; view: BundleOfferView } | null = null;
  for (const offer of offers) {
    if (!isBundleOfferActive(offer, now)) continue;
    const required = offer.productIds.map((id, index) => ({
      id,
      color: bundleItemColor(offer, index),
    }));
    if (!cartCoversBundleItems(required, cartLines)) continue;
    const unavailable = required.some((item) => {
      const product = products.find((row) => row.id === item.id);
      return !product || !bundleColorInStock(product, item.color);
    });
    if (unavailable) continue;
    const view = toBundleOfferView(offer, products);
    if (!view || view.savings <= 0) continue;
    if (!best || view.savings > best.view.savings) best = { offer, view };
  }
  return best;
}

export function bundleOfferStatus(
  offer: BundleOffer,
  now = new Date(),
): "active" | "inactive" | "scheduled" | "expired" | "removed" {
  if (offer.deletedAt) return "removed";
  if (!offer.active) return "inactive";
  if (offer.startsAt) {
    const start = Date.parse(offer.startsAt);
    if (!Number.isNaN(start) && start > now.getTime()) return "scheduled";
  }
  if (offer.endsAt) {
    const end = Date.parse(offer.endsAt);
    if (!Number.isNaN(end) && end < now.getTime()) return "expired";
  }
  return "active";
}

export function isBundleOfferActive(offer: BundleOffer, now = new Date()): boolean {
  if (!offer.active) return false;
  if (offer.deletedAt) return false;
  if (offer.startsAt) {
    const start = Date.parse(offer.startsAt);
    if (!Number.isNaN(start) && start > now.getTime()) return false;
  }
  if (offer.endsAt) {
    const end = Date.parse(offer.endsAt);
    if (!Number.isNaN(end) && end < now.getTime()) return false;
  }
  return true;
}

export function toBundleOfferView(offer: BundleOffer, products: Product[]): BundleOfferView | null {
  const items = offer.productIds.map((id, index) => {
    const product = products.find((row) => row.id === id);
    if (!product) return null;
    const price = parsePriceInr(product.price);
    if (!price) return null;
    return {
      id: product.id,
      name: product.name,
      color: bundleItemColor(offer, index),
      priceLabel: product.price,
      price,
    };
  });
  if (items.some((item) => item == null)) return null;
  const resolved = items.filter(
    (item): item is NonNullable<(typeof items)[number]> => item != null,
  );
  if (resolved.length < 2) return null;

  const individualTotal = resolved.reduce((sum, item) => sum + item.price, 0);
  const bundlePrice =
    offer.pricingType === "percent"
      ? Math.max(0, Math.round(individualTotal * (1 - offer.discountPercent / 100)))
      : offer.bundlePrice;
  const savings = Math.max(0, individualTotal - bundlePrice);
  const savingsPercent =
    individualTotal > 0 ? Math.round((savings / individualTotal) * 10000) / 100 : 0;

  return {
    id: offer.id,
    title: offer.title,
    items: resolved,
    individualTotal,
    individualTotalLabel: formatInr(individualTotal),
    bundlePrice,
    bundlePriceLabel: formatInr(bundlePrice),
    savings,
    savingsLabel: formatInr(savings),
    savingsPercent,
  };
}
