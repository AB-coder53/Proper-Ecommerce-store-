import { notFound } from "next/navigation";

import { AdminPageHeader } from "@/components/admin/AdminPageHeader";
import { OrderForm } from "@/components/admin/OrderForm";
import { StatusPill } from "@/components/admin/StatusPill";
import { ORDER_STATUS_LABELS, PAYMENT_STATUS_LABELS } from "@/lib/commerce-constants";
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
  const { id } = await params;
  const [order, products] = await Promise.all([getOrderById(id), getProducts()]);
  if (!order) notFound();

  return (
    <>
      <AdminPageHeader
        title={`Order #${order.orderNumber}`}
        description={order.customerName}
        actions={
          <div className="flex flex-wrap gap-2">
            <StatusPill status={order.paymentStatus}>
              {PAYMENT_STATUS_LABELS[order.paymentStatus] ?? order.paymentStatus}
            </StatusPill>
            <StatusPill status={order.orderStatus}>
              {ORDER_STATUS_LABELS[order.orderStatus] ?? order.orderStatus}
            </StatusPill>
          </div>
        }
      />
      <div className="mt-8">
        <OrderForm key={order.updatedAt} mode="edit" initial={order} products={products} />
      </div>
    </>
  );
}
