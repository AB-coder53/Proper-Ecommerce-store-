import { notFound, redirect } from "next/navigation";

import { AdminShell } from "@/components/admin/AdminShell";
import { ProductForm } from "@/components/admin/ProductForm";
import { getAdminSession } from "@/lib/admin-auth.server";
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
  const session = await getAdminSession();
  if (!session) redirect("/admin/login");
  const { id } = await params;
  const product = await getProductById(id);
  if (!product) notFound();

  return (
    <AdminShell username={session.username}>
      <h1 className="font-display text-3xl font-bold">Edit product</h1>
      <p className="mt-1 text-sm text-muted-foreground">{product.name}</p>
      <div className="mt-8">
        <ProductForm mode="edit" initial={product} />
      </div>
    </AdminShell>
  );
}
