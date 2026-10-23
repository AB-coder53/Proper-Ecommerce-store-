import { AnalyticsDashboard } from "@/components/admin/AnalyticsDashboard";
import { AnalyticsSetupNotice } from "@/components/admin/AnalyticsSetupNotice";
import { AdminPageHeader } from "@/components/admin/AdminPageHeader";
import { getAnalyticsSummary, isAnalyticsTableReady } from "@/lib/analytics.server";
import { buildPageMetadata } from "@/lib/seo";

export const metadata = buildPageMetadata({
  title: "Analytics",
  description: "Visitor tracking and traffic analytics for AB Collection",
  path: "/admin/analytics",
  noIndex: true,
});

export default async function AdminAnalyticsPage() {
  const ready = await isAnalyticsTableReady();
  const summary = await getAnalyticsSummary(7);

  return (
    <>
      <AdminPageHeader
        title="Analytics"
        description="Sales, inventory, coupons, and storefront traffic for the selected period."
      />
      {!ready ? (
        <div className="mt-8">
          <AnalyticsSetupNotice />
        </div>
      ) : null}
      <div className="mt-8">
        <AnalyticsDashboard initial={summary} />
      </div>
    </>
  );
}
