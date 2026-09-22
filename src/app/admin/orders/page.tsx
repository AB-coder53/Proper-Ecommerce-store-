import Link from "next/link";
import { redirect } from "next/navigation";

import { AdminShell } from "@/components/admin/AdminShell";
import { AdminOrdersTable } from "@/components/admin/AdminOrdersTable";
import { ExportCsvButton } from "@/components/admin/ExportCsvButton";
import { getAdminSession } from "@/lib/admin-auth.server";
import { listAllOrders } from "@/lib/commerce.server";

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
          <p className="mt-1 text-xs text-muted-foreground">
            Create, edit, or delete orders here. Status changes show up for customers within a few
            seconds.
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <ExportCsvButton type="orders" label="Export CSV" />
          <Link
            href="/admin/orders/new"
            className="inline-flex h-11 items-center rounded-full bg-teal px-5 text-sm font-semibold text-teal-foreground"
          >
            Add order
          </Link>
        </div>
      </div>

      <AdminOrdersTable initialOrders={orders} />
    </AdminShell>
  );
}
