import Link from "next/link";

import { AdminPageHeader } from "@/components/admin/AdminPageHeader";
import { StatusPill } from "@/components/admin/StatusPill";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { getCustomerAdmin } from "@/lib/commerce.server";
import { ORDER_STATUS_LABELS, PAYMENT_STATUS_LABELS } from "@/lib/commerce-constants";
import { formatInr } from "@/lib/price";
import { redirect } from "next/navigation";

export const dynamic = "force-dynamic";

export default async function AdminCustomerDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const result = await getCustomerAdmin(id);
  if (!result) redirect("/admin/customers");
  const { customer, orders } = result;

  return (
    <>
      <AdminPageHeader title={customer.fullName} description={customer.email} />

      <div className="mt-8 grid gap-6 lg:grid-cols-2">
        <Card className="bg-white shadow-none">
          <CardHeader>
            <CardTitle className="font-display text-xl">Profile</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2 text-sm">
            <div>
              <p className="text-muted-foreground">Phone</p>
              <p>{customer.phone}</p>
            </div>
            <div>
              <p className="text-muted-foreground">Alternate</p>
              <p>{customer.alternatePhone || "—"}</p>
            </div>
            <div>
              <p className="text-muted-foreground">Status</p>
              <StatusPill status={customer.status} className="mt-1">
                {customer.status}
              </StatusPill>
            </div>
            <div>
              <p className="text-muted-foreground">Registered</p>
              <p>{new Date(customer.createdAt).toLocaleString("en-IN")}</p>
            </div>
            <div>
              <p className="text-muted-foreground">Total orders</p>
              <p>{customer.totalOrders}</p>
            </div>
            <div>
              <p className="text-muted-foreground">Total spent</p>
              <p>{formatInr(customer.totalSpent)}</p>
            </div>
          </CardContent>
        </Card>
        <Card className="bg-white shadow-none">
          <CardHeader>
            <CardTitle className="font-display text-xl">Default address</CardTitle>
          </CardHeader>
          <CardContent className="text-sm">
            {customer.defaultAddress ? (
              <p>
                {customer.defaultAddress.line1}
                {customer.defaultAddress.line2 ? `, ${customer.defaultAddress.line2}` : ""}
                <br />
                {customer.defaultAddress.city}, {customer.defaultAddress.state}{" "}
                {customer.defaultAddress.pincode}
              </p>
            ) : (
              <p className="text-muted-foreground">No saved address.</p>
            )}
          </CardContent>
        </Card>
      </div>

      <Card className="mt-6 bg-white shadow-none">
        <CardHeader>
          <CardTitle className="font-display text-xl">Order history</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          {orders.map((order) => (
            <Link
              key={order.id}
              href={`/admin/orders/${order.id}`}
              className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-border px-4 py-3 text-sm hover:bg-muted/40"
            >
              <div>
                <p className="font-medium">#{order.orderNumber}</p>
                <p className="mt-1 flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
                  <StatusPill status={order.orderStatus}>
                    {ORDER_STATUS_LABELS[order.orderStatus] ?? order.orderStatus}
                  </StatusPill>
                  <StatusPill status={order.paymentStatus}>
                    {PAYMENT_STATUS_LABELS[order.paymentStatus] ?? order.paymentStatus}
                  </StatusPill>
                  <span>{new Date(order.createdAt).toLocaleDateString("en-IN")}</span>
                </p>
              </div>
              <p className="font-semibold text-teal">{formatInr(order.totalAmount)}</p>
            </Link>
          ))}
          {!orders.length ? (
            <p className="text-sm text-muted-foreground">No orders for this customer.</p>
          ) : null}
        </CardContent>
      </Card>
    </>
  );
}
