import { AdminPageHeader } from "@/components/admin/AdminPageHeader";
import { OrderForm } from "@/components/admin/OrderForm";
import { getProducts } from "@/lib/catalog.server";
import { buildPageMetadata } from "@/lib/seo";

export const metadata = buildPageMetadata({
  title: "New order",
  description: "Create an AB Collection order",
  path: "/admin/orders/new",
  noIndex: true,
});

export default async function NewAdminOrderPage() {
  const products = await getProducts();

  return (
    <>
      <AdminPageHeader
        title="New order"
        description="Create a phone, WhatsApp, or reservation order. Customers see it immediately."
      />
      <div className="mt-8">
        <OrderForm mode="create" products={products} />
      </div>
    </>
  );
}
