import type { MetadataRoute } from "next";

import { canonicalUrl } from "@/lib/canonical-url";
import { getProducts } from "@/lib/catalog.server";
import { PUBLIC_STATIC_ROUTES } from "@/lib/seo-routes";

export const dynamic = "force-dynamic";
export const revalidate = 3600;

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const now = new Date();
  const products = await getProducts();

  const staticRoutes: MetadataRoute.Sitemap = PUBLIC_STATIC_ROUTES.map(
    ({ path, changeFrequency, priority }) => ({
      url: canonicalUrl(path),
      lastModified: now,
      changeFrequency,
      priority,
    }),
  );

  const productRoutes: MetadataRoute.Sitemap = products.map((product) => ({
    url: canonicalUrl(`/collection/${product.id}`),
    lastModified: now,
    changeFrequency: "weekly",
    priority: product.featured ? 0.85 : 0.8,
  }));

  return [...staticRoutes, ...productRoutes];
}
