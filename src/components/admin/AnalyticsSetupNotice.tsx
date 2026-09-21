import { getAnalyticsSetupSql } from "@/lib/analytics.server";
import { cn } from "@/lib/utils";

export function AnalyticsSetupNotice({ className }: { className?: string }) {
  const sql = getAnalyticsSetupSql();

  return (
    <div
      className={cn(
        "rounded-3xl border border-amber-200 bg-amber-50 px-5 py-5 text-sm text-amber-950",
        className,
      )}
    >
      <p className="font-semibold">Analytics table not set up yet</p>
      <p className="mt-2 leading-relaxed">
        Run this once to create <code className="text-xs">site_analytics_events</code>:
      </p>
      <ol className="mt-3 list-decimal space-y-2 pl-5">
        <li>Open Supabase → SQL Editor</li>
        <li>Paste the SQL below and click Run</li>
        <li>Refresh this page</li>
      </ol>
      <pre className="mt-4 max-h-64 overflow-auto rounded-2xl border border-amber-200/80 bg-white p-4 text-xs leading-relaxed text-foreground">
        {sql.trim()}
      </pre>
    </div>
  );
}
