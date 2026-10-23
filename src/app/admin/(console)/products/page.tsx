import Link from "next/link";

import { AdminPageHeader } from "@/components/admin/AdminPageHeader";
import { ExportCsvButton } from "@/components/admin/ExportCsvButton";
import { ProductsTable } from "@/components/admin/ProductsTable";
import { Button } from "@/components/ui/button";
import { getAdminProducts } from "@/lib/catalog.server";
import { buildPageMetadata } from "@/lib/seo";

export const metadata = buildPageMetadata({
  title: "Admin Products",
  description: "Manage AB Collection products",
  path: "/admin/products",
  noIndex: true,
});

export default async function AdminProductsPage() {
  const products = await getAdminProducts();

  return (
    <>
      <AdminPageHeader
        title="Products"
        description="Active products are on the website. Archived products stay here and are hidden from the shop."
        actions={
          <>
            <ExportCsvButton type="products" label="Export products CSV" />
            <ExportCsvButton type="inventory" label="Export inventory CSV" />
            <Button asChild className="rounded-full bg-teal text-teal-foreground hover:bg-teal/90">
              <Link href="/admin/products/new">Add product</Link>
            </Button>
          </>
        }
      />
      <ProductsTable products={products} />
    </>
  );
}
