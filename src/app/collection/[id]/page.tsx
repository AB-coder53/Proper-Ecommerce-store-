import type { Metadata } from "next";
import { notFound } from "next/navigation";

import { ProductDetail } from "@/app/collection/[id]/ProductDetail";
import { getAllProductIds, getProductById } from "@/lib/catalog.server";
import { JsonLd, breadcrumbJsonLd, buildPageMetadata, productJsonLd } from "@/lib/seo";

type Props = { params: Promise<{ id: string }> };

export const dynamic = "force-dynamic";

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

  return (
    <>
      <JsonLd
        data={[
          breadcrumbJsonLd([
            { name: "Home", path: "/" },
            { name: "Collection", path: "/collection" },
            { name: product.name, path: `/collection/${product.id}` },
          ]),
          productJsonLd(product),
        ]}
      />
      <ProductDetail product={product} />
    </>
  );
}
