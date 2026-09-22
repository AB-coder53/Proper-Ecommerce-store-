import { notFound, redirect } from "next/navigation";

import { AdminShell } from "@/components/admin/AdminShell";
import { OrderForm } from "@/components/admin/OrderForm";
import { getAdminSession } from "@/lib/admin-auth.server";
import { getProducts } from "@/lib/catalog.server";
import { getOrderById } from "@/lib/commerce.server";
import { buildPageMetadata } from "@/lib/seo";

type Props = { params: Promise<{ id: string }> };

export async function generateMetadata({ params }: Props) {
  const { id } = await params;
  const order = await getOrderById(id);
  return buildPageMetadata({
    title: order ? `Order ${order.orderNumber}` : "Order",
    description: "Edit order",
    path: `/admin/orders/${id}`,
    noIndex: true,
  });
}

export default async function AdminOrderDetailPage({ params }: Props) {
  const session = await getAdminSession();
  if (!session) redirect("/admin/login");
  const { id } = await params;
  const [order, products] = await Promise.all([getOrderById(id), getProducts()]);
  if (!order) notFound();

  return (
    <AdminShell username={session.username}>
      <OrderForm key={order.updatedAt} mode="edit" initial={order} products={products} />
    </AdminShell>
  );
}
