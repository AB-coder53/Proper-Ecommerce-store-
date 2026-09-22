import { AdminShell } from "@/components/admin/AdminShell";
import { AdminOrdersTable } from "@/components/admin/AdminOrdersTable";
import { ExportCsvButton } from "@/components/admin/ExportCsvButton";
import { getAdminSession } from "@/lib/admin-auth.server";
import { listAllOrders } from "@/lib/commerce.server";
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
          <p className="mt-1 text-xs text-muted-foreground">
            Prelaunch reservations are included here with their original AB- IDs. Use Processing,
            Shipped, or Delivered on any row. Customers see the new status within a few seconds.
          </p>
        </div>
        <ExportCsvButton type="orders" label="Export CSV" />
      </div>

      <AdminOrdersTable initialOrders={orders} />
    </AdminShell>
  );
}
