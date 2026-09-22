import { redirect } from "next/navigation";

import { AnalyticsDashboard } from "@/components/admin/AnalyticsDashboard";
import { AnalyticsSetupNotice } from "@/components/admin/AnalyticsSetupNotice";
import { AdminShell } from "@/components/admin/AdminShell";
import { getAdminSession } from "@/lib/admin-auth.server";
import { getAnalyticsSummary, isAnalyticsTableReady } from "@/lib/analytics.server";
import { buildPageMetadata } from "@/lib/seo";

export const metadata = buildPageMetadata({
  title: "Analytics",
  description: "Visitor tracking and traffic analytics for AB Collection",
  path: "/admin/analytics",
  noIndex: true,
});

export default async function AdminAnalyticsPage() {
  const session = await getAdminSession();
  if (!session) redirect("/admin/login");

  const ready = await isAnalyticsTableReady();
  const summary = await getAnalyticsSummary(7);

  return (
    <AdminShell username={session.username}>
      <h1 className="font-display text-3xl font-bold">Analytics</h1>
      <p className="mt-2 max-w-2xl text-sm text-muted-foreground">
        Sales, inventory, coupons, and storefront traffic for the selected period.
      </p>

      {!ready ? (
        <div className="mt-8">
          <AnalyticsSetupNotice />
        </div>
      ) : null}
      <div className="mt-8">
        <AnalyticsDashboard initial={summary} />
      </div>
    </AdminShell>
  );
}
