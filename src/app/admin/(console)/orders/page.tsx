import Link from "next/link";

import { AdminOrdersTable } from "@/components/admin/AdminOrdersTable";
import { AdminPageHeader } from "@/components/admin/AdminPageHeader";
import { ExportCsvButton } from "@/components/admin/ExportCsvButton";
import { Button } from "@/components/ui/button";
import { listAllOrders } from "@/lib/commerce.server";
import { isListedOrder } from "@/lib/order-tracking";

export const dynamic = "force-dynamic";

export default async function AdminOrdersPage() {
  const orders = (await listAllOrders()).filter(isListedOrder);

  return (
    <>
      <AdminPageHeader
        title="Orders"
        description={
          <>
            {orders.length} total orders. Create, edit, or delete orders here. Status changes show
            up for customers within a few seconds.
          </>
        }
        actions={
          <>
            <ExportCsvButton type="orders" label="Export CSV" />
            <Button asChild className="rounded-full bg-teal text-teal-foreground hover:bg-teal/90">
              <Link href="/admin/orders/new">Add order</Link>
            </Button>
          </>
        }
      />
      <AdminOrdersTable initialOrders={orders} />
    </>
  );
}
