import type { Metadata } from "next";
import { notFound } from "next/navigation";

import { ProductDetail } from "./ProductDetail";
import { getAllProductIds, getProductById } from "@/lib/catalog.server";
import { JsonLd, breadcrumbJsonLd, buildPageMetadata, productJsonLd } from "@/lib/seo";
import { listPublicReviews } from "@/lib/reviews.server";
import { getDeliveryEstimate } from "@/lib/shipping.server";
import { getActiveBundleViewsForProduct } from "@/lib/store-offers.server";

type Props = { params: Promise<{ id: string }> };

export const revalidate = 60;

export async function generateStaticParams() {
  const ids = await getAllProductIds();
  return ids.map((id) => ({ id }));
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { id } = await params;
  const product = await getProductById(id);
  if (!product) return {};

  return buildPageMetadata({
    title: product.name,
    description: `${product.description} Available in ${product.colors.join(", ")}. From ${product.price}.`,
    path: `/collection/${product.id}`,
    image: product.image,
  });
}

export default async function ProductPage({ params }: Props) {
  const { id } = await params;
  const product = await getProductById(id);
  if (!product) notFound();
  const [bundles, delivery, reviewListing] = await Promise.all([
    getActiveBundleViewsForProduct(product.id),
    getDeliveryEstimate(product.id),
    listPublicReviews(product.id),
  ]);

  return (
    <>
      <JsonLd
        data={[
          breadcrumbJsonLd([
            { name: "Home", path: "/" },
            { name: "Collection", path: "/collection" },
            { name: product.name, path: `/collection/${product.id}` },
          ]),
          productJsonLd(product, reviewListing.summary),
        ]}
      />
      <ProductDetail
        product={product}
        bundles={bundles}
        delivery={delivery}
        reviewListing={reviewListing}
      />
    </>
  );
}
