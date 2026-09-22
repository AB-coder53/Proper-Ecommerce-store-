import { redirect } from "next/navigation";

import { AdminShell } from "@/components/admin/AdminShell";
import { OrderForm } from "@/components/admin/OrderForm";
import { getAdminSession } from "@/lib/admin-auth.server";
import { getProducts } from "@/lib/catalog.server";
import { buildPageMetadata } from "@/lib/seo";

export const metadata = buildPageMetadata({
  title: "New order",
  description: "Create an AB Collection order",
  path: "/admin/orders/new",
  noIndex: true,
});

export default async function NewAdminOrderPage() {
  const session = await getAdminSession();
  if (!session) redirect("/admin/login");
  const products = await getProducts();

  return (
    <AdminShell username={session.username}>
      <OrderForm mode="create" products={products} />
    </AdminShell>
  );
}
