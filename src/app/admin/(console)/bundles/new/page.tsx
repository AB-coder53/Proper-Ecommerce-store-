import { AdminPageHeader } from "@/components/admin/AdminPageHeader";
import { BundleForm } from "@/components/admin/BundleForm";
import { getProducts } from "@/lib/catalog.server";
import { buildPageMetadata } from "@/lib/seo";

export const metadata = buildPageMetadata({
  title: "Add bundle",
  description: "Create a bundle offer",
  path: "/admin/bundles/new",
  noIndex: true,
});

export default async function NewBundlePage() {
  const products = await getProducts();

  return (
    <>
      <AdminPageHeader
        title="Add bundle"
        description="Choose each product and its colour. The offer shows on those product pages."
      />
      <div className="mt-8">
        <BundleForm mode="create" products={products} />
      </div>
    </>
  );
}
