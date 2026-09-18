import Link from "next/link";
import { redirect } from "next/navigation";

import { AdminShell } from "@/components/admin/AdminShell";
import { getAdminSession } from "@/lib/admin-auth.server";
import { getCustomerAdmin } from "@/lib/commerce.server";
import { ORDER_STATUS_LABELS } from "@/lib/commerce-constants";
import { formatInr } from "@/lib/price";

export const dynamic = "force-dynamic";

export default async function AdminCustomerDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const session = await getAdminSession();
  if (!session) redirect("/admin/login");
  const { id } = await params;
  const result = await getCustomerAdmin(id);
  if (!result) redirect("/admin/customers");
  const { customer, orders } = result;

  return (
    <AdminShell username={session.username}>
      <Link href="/admin/customers" className="text-sm text-muted-foreground hover:text-foreground">
        ← Customers
      </Link>
      <h1 className="mt-3 font-display text-3xl font-bold">{customer.fullName}</h1>
      <p className="mt-1 text-sm text-muted-foreground">{customer.email}</p>

      <div className="mt-8 grid gap-6 lg:grid-cols-2">
        <section className="rounded-2xl border border-border bg-white p-5 text-sm">
          <h2 className="font-semibold">Profile</h2>
          <dl className="mt-3 space-y-2">
            <div>
              <dt className="text-muted-foreground">Phone</dt>
              <dd>{customer.phone}</dd>
            </div>
            <div>
              <dt className="text-muted-foreground">Alternate</dt>
              <dd>{customer.alternatePhone || "—"}</dd>
            </div>
            <div>
              <dt className="text-muted-foreground">Status</dt>
              <dd className="capitalize">{customer.status}</dd>
            </div>
            <div>
              <dt className="text-muted-foreground">Registered</dt>
              <dd>{new Date(customer.createdAt).toLocaleString("en-IN")}</dd>
            </div>
            <div>
              <dt className="text-muted-foreground">Total orders</dt>
              <dd>{customer.totalOrders}</dd>
            </div>
            <div>
              <dt className="text-muted-foreground">Total spent</dt>
              <dd>{formatInr(customer.totalSpent)}</dd>
            </div>
          </dl>
        </section>
        <section className="rounded-2xl border border-border bg-white p-5 text-sm">
          <h2 className="font-semibold">Default address</h2>
          {customer.defaultAddress ? (
            <p className="mt-3">
              {customer.defaultAddress.line1}
              {customer.defaultAddress.line2 ? `, ${customer.defaultAddress.line2}` : ""}
              <br />
              {customer.defaultAddress.city}, {customer.defaultAddress.state}{" "}
              {customer.defaultAddress.pincode}
            </p>
          ) : (
            <p className="mt-3 text-muted-foreground">No saved address.</p>
          )}
        </section>
      </div>

      <section className="mt-6 rounded-2xl border border-border bg-white p-5">
        <h2 className="font-semibold">Order history</h2>
        <div className="mt-4 space-y-3">
          {orders.map((order) => (
            <Link
              key={order.id}
              href={`/admin/orders/${order.id}`}
              className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-border px-4 py-3 text-sm hover:border-foreground"
            >
              <div>
                <p className="font-medium">#{order.orderNumber}</p>
                <p className="text-xs text-muted-foreground">
                  {ORDER_STATUS_LABELS[order.orderStatus]} ·{" "}
                  {new Date(order.createdAt).toLocaleDateString("en-IN")}
                </p>
              </div>
              <p className="font-semibold text-teal">{formatInr(order.totalAmount)}</p>
            </Link>
          ))}
          {!orders.length ? (
            <p className="text-sm text-muted-foreground">No orders for this customer.</p>
          ) : null}
        </div>
      </section>
    </AdminShell>
  );
}
