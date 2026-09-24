import Link from "next/link";
import { redirect } from "next/navigation";

import { AdminShell } from "@/components/admin/AdminShell";
import { ExportCsvButton } from "@/components/admin/ExportCsvButton";
import { ProductsTable } from "@/components/admin/ProductsTable";
import { getAdminSession } from "@/lib/admin-auth.server";
import { headerCtaClassName } from "@/lib/button-styles";
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
        <div className="flex flex-wrap gap-2">
          <ExportCsvButton type="products" label="Export products CSV" />
          <ExportCsvButton type="inventory" label="Export inventory CSV" />
          <Link href="/admin/products/new" className={headerCtaClassName}>
            Add product
          </Link>
        </div>
      </div>
      <div className="mt-8">
        <ProductsTable products={products} />
      </div>
    </AdminShell>
  );
}
