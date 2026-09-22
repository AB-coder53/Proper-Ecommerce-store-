import Link from "next/link";

import { AdminShell } from "@/components/admin/AdminShell";
import { ExportCsvButton } from "@/components/admin/ExportCsvButton";
import { getAdminSession } from "@/lib/admin-auth.server";
import { listAllOrders } from "@/lib/commerce.server";
import { ORDER_STATUS_LABELS, PAYMENT_STATUS_LABELS } from "@/lib/commerce-constants";
import { formatInr } from "@/lib/price";
import { redirect } from "next/navigation";

export const dynamic = "force-dynamic";

export default async function AdminOrdersPage() {
  const session = await getAdminSession();
  if (!session) redirect("/admin/login");
  const orders = await listAllOrders();

  return (
    <AdminShell username={session.username}>
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="font-display text-3xl font-bold">Orders</h1>
          <p className="mt-1 text-sm text-muted-foreground">{orders.length} total orders</p>
        </div>
        <ExportCsvButton type="orders" label="Export CSV" />
      </div>

      <div className="mt-8 overflow-x-auto rounded-2xl border border-border bg-white">
        <table className="min-w-full text-left text-sm">
          <thead className="border-b border-border bg-muted/40 text-xs tracking-[0.08em] text-muted-foreground uppercase">
            <tr>
              <th className="px-4 py-3">Order</th>
              <th className="px-4 py-3">Customer</th>
              <th className="px-4 py-3">Total</th>
              <th className="px-4 py-3">Payment</th>
              <th className="px-4 py-3">Status</th>
              <th className="px-4 py-3">Date</th>
            </tr>
          </thead>
          <tbody>
            {orders.map((order) => (
              <tr key={order.id} className="border-b border-border last:border-0">
                <td className="px-4 py-3">
                  <Link
                    href={`/admin/orders/${order.id}`}
                    className="font-medium text-teal hover:underline"
                  >
                    #{order.orderNumber}
                  </Link>
                </td>
                <td className="px-4 py-3">
                  <div className="font-medium">{order.customerName}</div>
                  <div className="text-xs text-muted-foreground">{order.customerEmail}</div>
                  <div className="text-xs text-muted-foreground">{order.customerPhone}</div>
                </td>
                <td className="px-4 py-3 font-semibold">{formatInr(order.totalAmount)}</td>
                <td className="px-4 py-3">{PAYMENT_STATUS_LABELS[order.paymentStatus]}</td>
                <td className="px-4 py-3">{ORDER_STATUS_LABELS[order.orderStatus]}</td>
                <td className="px-4 py-3 text-muted-foreground">
                  {new Date(order.createdAt).toLocaleString("en-IN")}
                </td>
              </tr>
            ))}
            {!orders.length ? (
              <tr>
                <td colSpan={6} className="px-4 py-10 text-center text-muted-foreground">
                  No orders yet.
                </td>
              </tr>
            ) : null}
          </tbody>
        </table>
      </div>
    </AdminShell>
  );
}
