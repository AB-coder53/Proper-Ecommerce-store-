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
  const summary = ready ? await getAnalyticsSummary(7) : null;

  return (
    <AdminShell username={session.username}>
      <h1 className="font-display text-3xl font-bold">Analytics</h1>
      <p className="mt-2 max-w-2xl text-sm text-muted-foreground">
        Track how many people visit your site, which pages they view, what they click, and where
        they came from — including Google, Instagram, UTM links, and campaign pages like Istefada.
      </p>

      {!ready || !summary ? (
        <div className="mt-8">
          <AnalyticsSetupNotice />
        </div>
      ) : (
        <div className="mt-8">
          <AnalyticsDashboard initial={summary} />
        </div>
      )}
    </AdminShell>
  );
}
