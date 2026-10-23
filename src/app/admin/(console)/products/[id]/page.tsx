import { notFound } from "next/navigation";

import { AdminPageHeader } from "@/components/admin/AdminPageHeader";
import { ProductForm } from "@/components/admin/ProductForm";
import { getProductById } from "@/lib/catalog.server";
import { buildPageMetadata } from "@/lib/seo";

type Props = { params: Promise<{ id: string }> };

export async function generateMetadata({ params }: Props) {
  const { id } = await params;
  return buildPageMetadata({
    title: `Edit ${id}`,
    description: "Edit product",
    path: `/admin/products/${id}`,
    noIndex: true,
  });
}

export default async function EditProductPage({ params }: Props) {
  const { id } = await params;
  const product = await getProductById(id);
  if (!product) notFound();

  return (
    <>
      <AdminPageHeader title="Edit product" description={product.name} />
      <div className="mt-8">
        <ProductForm mode="edit" initial={product} />
      </div>
    </>
  );
}
