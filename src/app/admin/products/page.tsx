import Link from "next/link";
import { redirect } from "next/navigation";

import { AdminShell } from "@/components/admin/AdminShell";
import { ProductsTable } from "@/components/admin/ProductsTable";
import { getAdminSession } from "@/lib/admin-auth.server";
import { getProducts } from "@/lib/catalog.server";
import { buildPageMetadata } from "@/lib/seo";

export const metadata = buildPageMetadata({
  title: "Admin Products",
  description: "Manage AB Collection products",
  path: "/admin/products",
  noIndex: true,
});

export default async function AdminProductsPage() {
  const session = await getAdminSession();
  if (!session) redirect("/admin/login");
  const products = await getProducts();

  return (
    <AdminShell username={session.username}>
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="font-display text-3xl font-bold">Products</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Create, edit, or delete catalogue items.
          </p>
        </div>
        <Link
          href="/admin/products/new"
          className="inline-flex h-11 items-center rounded-full bg-teal px-5 text-sm font-semibold text-teal-foreground"
        >
          Add product
        </Link>
      </div>
      <div className="mt-8">
        <ProductsTable products={products} />
      </div>
    </AdminShell>
  );
}
