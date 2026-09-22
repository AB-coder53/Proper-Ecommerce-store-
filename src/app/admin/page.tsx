import Link from "next/link";
import { redirect } from "next/navigation";

import { AdminShell } from "@/components/admin/AdminShell";
import { getAdminSession } from "@/lib/admin-auth.server";
import { getAnalyticsSummary, isAnalyticsTableReady } from "@/lib/analytics.server";
import { getCatalog } from "@/lib/catalog.server";
import { buildPageMetadata } from "@/lib/seo";

export const metadata = buildPageMetadata({
  title: "Admin",
  description: "AB Collection admin dashboard",
  path: "/admin",
  noIndex: true,
});

export default async function AdminDashboardPage() {
  const session = await getAdminSession();
  if (!session) redirect("/admin/login");

  const catalog = await getCatalog();
  let analyticsVisitors = 0;
  let analyticsPageViews = 0;
  try {
    if (await isAnalyticsTableReady()) {
      const analytics = await getAnalyticsSummary(7);
      analyticsVisitors = analytics.uniqueVisitors;
      analyticsPageViews = analytics.pageViews;
    }
  } catch {
    /* analytics optional on dashboard */
  }

  return (
    <AdminShell username={session.username}>
      <h1 className="font-display text-3xl font-bold">Dashboard</h1>
      <p className="mt-2 text-sm text-muted-foreground">
        Manage storefront products and discover collections.
      </p>

      <div className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        <div className="rounded-3xl border border-border bg-white p-6">
          <p className="text-sm text-muted-foreground">Visitors (7 days)</p>
          <p className="mt-2 font-display text-4xl font-bold">{analyticsVisitors}</p>
          <p className="mt-1 text-xs text-muted-foreground">{analyticsPageViews} page views</p>
          <Link
            href="/admin/analytics"
            className="mt-4 inline-block text-sm font-semibold text-teal"
          >
            View analytics →
          </Link>
        </div>
        <div className="rounded-3xl border border-border bg-white p-6">
          <p className="text-sm text-muted-foreground">Products</p>
          <p className="mt-2 font-display text-4xl font-bold">{catalog.products.length}</p>
          <Link
            href="/admin/products"
            className="mt-4 inline-block text-sm font-semibold text-teal"
          >
            Manage products →
          </Link>
        </div>
        <div className="rounded-3xl border border-border bg-white p-6">
          <p className="text-sm text-muted-foreground">Bundles & shipping</p>
          <p className="mt-2 text-sm text-muted-foreground">
            Configure product-page bundle offers and delivery estimates.
          </p>
          <div className="mt-4 flex flex-wrap gap-3 text-sm font-semibold text-teal">
            <Link href="/admin/bundles">Manage bundles →</Link>
            <Link href="/admin/shipping">Shipping settings →</Link>
          </div>
        </div>
        <div className="rounded-3xl border border-border bg-white p-6">
          <p className="text-sm text-muted-foreground">Collections</p>
          <p className="mt-2 font-display text-4xl font-bold">{catalog.collections.length}</p>
          <Link
            href="/admin/collections"
            className="mt-4 inline-block text-sm font-semibold text-teal"
          >
            Manage collections →
          </Link>
        </div>
      </div>
    </AdminShell>
  );
}
