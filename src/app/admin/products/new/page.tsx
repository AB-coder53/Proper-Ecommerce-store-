import { redirect } from "next/navigation";

import { AdminShell } from "@/components/admin/AdminShell";
import { ProductForm } from "@/components/admin/ProductForm";
import { getAdminSession } from "@/lib/admin-auth.server";
import { buildPageMetadata } from "@/lib/seo";

export const metadata = buildPageMetadata({
  title: "Add Product",
  description: "Create a new AB Collection product",
  path: "/admin/products/new",
  noIndex: true,
});

export default async function NewProductPage() {
  const session = await getAdminSession();
  if (!session) redirect("/admin/login");

  return (
    <AdminShell username={session.username}>
      <h1 className="font-display text-3xl font-bold">Add product</h1>
      <div className="mt-8">
        <ProductForm mode="create" />
      </div>
    </AdminShell>
  );
}
