import { AdminPageHeader } from "@/components/admin/AdminPageHeader";
import { ProductForm } from "@/components/admin/ProductForm";
import { buildPageMetadata } from "@/lib/seo";

export const metadata = buildPageMetadata({
  title: "Add Product",
  description: "Create a new AB Collection product",
  path: "/admin/products/new",
  noIndex: true,
});

export default function NewProductPage() {
  return (
    <>
      <AdminPageHeader title="Add product" description="Add a catalogue item, photos, and stock." />
      <div className="mt-8">
        <ProductForm mode="create" />
      </div>
    </>
  );
}
