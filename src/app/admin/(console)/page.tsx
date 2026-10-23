import Link from "next/link";

import { AdminPageHeader } from "@/components/admin/AdminPageHeader";
import { StatusPill } from "@/components/admin/StatusPill";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { getAnalyticsSummary } from "@/lib/analytics.server";
import { ORDER_STATUS_LABELS } from "@/lib/commerce-constants";
import { listAllOrders } from "@/lib/commerce.server";
import { isListedOrder } from "@/lib/order-tracking";
import { formatInr } from "@/lib/price";
import { buildPageMetadata } from "@/lib/seo";

export const metadata = buildPageMetadata({
  title: "Admin",
  description: "AB Collection admin dashboard",
  path: "/admin",
  noIndex: true,
});

export const dynamic = "force-dynamic";

function deltaLabel(current: number, previous: number) {
  if (!previous) return current ? "New this period" : "No change";
  const pct = Math.round(((current - previous) / previous) * 100);
  const sign = pct > 0 ? "+" : "";
  return `${sign}${pct}% vs prior period`;
}

export default async function AdminDashboardPage() {
  const [analyticsResult, ordersResult] = await Promise.allSettled([
    getAnalyticsSummary(7),
    listAllOrders(),
  ]);
  const summary = analyticsResult.status === "fulfilled" ? analyticsResult.value : null;
  const commerce = summary?.commerce;
  const recent =
    ordersResult.status === "fulfilled" ? ordersResult.value.filter(isListedOrder).slice(0, 5) : [];
  const lowStock = (commerce?.lowStock ?? []).slice(0, 6);

  return (
    <>
      <AdminPageHeader
        title="Dashboard"
        description="Sales, orders, and catalogue health for the last 7 days."
        actions={
          <>
            <Button asChild variant="outline" className="rounded-full">
              <Link href="/admin/analytics">Open analytics</Link>
            </Button>
            <Button asChild variant="outline" className="rounded-full">
              <Link href="/admin/orders/new">Add order</Link>
            </Button>
            <Button asChild className="rounded-full bg-teal text-teal-foreground hover:bg-teal/90">
              <Link href="/admin/products/new">Add product</Link>
            </Button>
          </>
        }
      />

      <div className="mt-8 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <Kpi
          label="Revenue"
          value={formatInr(commerce?.revenue ?? 0)}
          hint={
            commerce ? deltaLabel(commerce.revenue, commerce.previousRevenue) : "Sales unavailable"
          }
        />
        <Kpi
          label="Completed orders"
          value={(commerce?.orders ?? 0).toLocaleString("en-IN")}
          hint={
            commerce ? deltaLabel(commerce.orders, commerce.previousOrders) : "Orders unavailable"
          }
        />
        <Kpi
          label="Average order value"
          value={formatInr(commerce?.aov ?? 0)}
          hint="Revenue / completed orders"
        />
        <Kpi
          label="Visitors"
          value={(summary?.uniqueVisitors ?? 0).toLocaleString("en-IN")}
          hint={
            summary
              ? `${summary.pageViews.toLocaleString("en-IN")} page views`
              : "Traffic unavailable"
          }
        />
      </div>

      <div className="mt-6 grid gap-4 lg:grid-cols-2">
        <Card className="bg-white shadow-none">
          <CardHeader className="flex-row items-center justify-between space-y-0">
            <CardTitle className="font-display text-xl">Recent orders</CardTitle>
            <Button asChild variant="ghost" size="sm" className="rounded-full">
              <Link href="/admin/orders">View all</Link>
            </Button>
          </CardHeader>
          <CardContent className="space-y-3">
            {recent.length ? (
              recent.map((order) => (
                <Link
                  key={order.id}
                  href={`/admin/orders/${order.id}`}
                  className="flex items-center justify-between gap-3 rounded-xl border border-border px-3 py-2 text-sm hover:bg-muted/40"
                >
                  <span>
                    <span className="font-medium">#{order.orderNumber}</span>
                    <span className="mt-0.5 block text-xs text-muted-foreground">
                      {order.customerName}
                    </span>
                  </span>
                  <span className="flex items-center gap-3">
                    <StatusPill status={order.orderStatus}>
                      {ORDER_STATUS_LABELS[order.orderStatus] ?? order.orderStatus}
                    </StatusPill>
                    <span className="font-semibold">{formatInr(order.totalAmount)}</span>
                  </span>
                </Link>
              ))
            ) : (
              <p className="text-sm text-muted-foreground">No orders yet.</p>
            )}
          </CardContent>
        </Card>

        <Card className="bg-white shadow-none">
          <CardHeader className="flex-row items-center justify-between space-y-0">
            <CardTitle className="font-display text-xl">Low stock</CardTitle>
            <Button asChild variant="ghost" size="sm" className="rounded-full">
              <Link href="/admin/products">Manage products</Link>
            </Button>
          </CardHeader>
          <CardContent className="space-y-3">
            {lowStock.length ? (
              lowStock.map((row) => (
                <div
                  key={`${row.product}-${row.color}-${row.size}`}
                  className="flex items-center justify-between gap-3 rounded-xl border border-border px-3 py-2 text-sm"
                >
                  <span>
                    <span className="font-medium">{row.product}</span>
                    <span className="mt-0.5 block text-xs text-muted-foreground">
                      {row.color} / {row.size}
                    </span>
                  </span>
                  <StatusPill tone={row.stock === 0 ? "danger" : "warning"}>
                    {row.stock} left
                  </StatusPill>
                </div>
              ))
            ) : (
              <p className="text-sm text-muted-foreground">No low-stock variants right now.</p>
            )}
          </CardContent>
        </Card>
      </div>
    </>
  );
}

function Kpi({ label, value, hint }: { label: string; value: string; hint: string }) {
  return (
    <Card className="bg-white shadow-none">
      <CardHeader className="pb-2">
        <CardTitle className="text-sm font-medium text-muted-foreground">{label}</CardTitle>
      </CardHeader>
      <CardContent>
        <p className="font-display text-3xl font-bold">{value}</p>
        <p className="mt-1 text-xs text-muted-foreground">{hint}</p>
      </CardContent>
    </Card>
  );
}
