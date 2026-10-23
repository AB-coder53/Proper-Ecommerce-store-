import { AdminPageHeader } from "@/components/admin/AdminPageHeader";
import { CollectionForm } from "@/components/admin/CollectionForm";
import { getProducts } from "@/lib/catalog.server";
import { buildPageMetadata } from "@/lib/seo";

export const metadata = buildPageMetadata({
  title: "Add Collection",
  description: "Create a discover collection",
  path: "/admin/collections/new",
  noIndex: true,
});

export default async function NewCollectionPage() {
  const products = await getProducts();

  return (
    <>
      <AdminPageHeader
        title="Add collection"
        description="Collections appear in the Discover section on the homepage."
      />
      <div className="mt-8">
        <CollectionForm mode="create" products={products} />
      </div>
    </>
  );
}
