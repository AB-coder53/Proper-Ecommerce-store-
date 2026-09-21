"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import {
  Bar,
  BarChart,
  CartesianGrid,
  Legend,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import type { AnalyticsSummary } from "@/lib/analytics.types";

const PERIODS = [
  { label: "7 days", value: 7 },
  { label: "30 days", value: 30 },
  { label: "90 days", value: 90 },
] as const;

function formatDate(value: string) {
  const date = new Date(`${value}T00:00:00`);
  return date.toLocaleDateString("en-IN", { month: "short", day: "numeric" });
}

function formatDateTime(value: string) {
  return new Date(value).toLocaleString("en-IN", {
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function resolveEventSource(event: AnalyticsSummary["recentEvents"][number]) {
  if (event.utmSource) return `UTM: ${event.utmSource}`;
  if (event.campaignSource) return `Campaign: ${event.campaignSource}`;
  if (event.referrerHost) return event.referrerHost;
  return "Direct";
}

export function AnalyticsDashboard({ initial }: { initial: AnalyticsSummary }) {
  const [days, setDays] = useState(initial.periodDays);
  const [data, setData] = useState(initial);
  const [loading, setLoading] = useState(false);
  const skipInitialFetch = useRef(true);

  const load = useCallback(async (period: number) => {
    setLoading(true);
    try {
      const response = await fetch(`/api/admin/analytics?days=${period}`, { cache: "no-store" });
      if (!response.ok) throw new Error("Failed to load analytics");
      const summary = (await response.json()) as AnalyticsSummary;
      setData(summary);
    } catch {
      /* keep previous data */
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (skipInitialFetch.current) {
      skipInitialFetch.current = false;
      return;
    }
    void load(days);
  }, [days, load]);

  const chartData = data.daily.map((row) => ({
    ...row,
    label: formatDate(row.date),
  }));

  return (
    <div className={cn(loading && "opacity-70 transition-opacity")}>
      <div className="flex flex-wrap items-center gap-2">
        {PERIODS.map((period) => (
          <Button
            key={period.value}
            type="button"
            variant={days === period.value ? "default" : "outline"}
            className={cn(
              "rounded-full",
              days === period.value && "bg-teal text-teal-foreground hover:bg-teal/90",
            )}
            onClick={() => setDays(period.value)}
          >
            {period.label}
          </Button>
        ))}
      </div>

      <div className="mt-8 grid gap-4 sm:grid-cols-3">
        <StatCard label="Unique visitors" value={data.uniqueVisitors} />
        <StatCard label="Page views" value={data.pageViews} />
        <StatCard label="Clicks tracked" value={data.clicks} />
      </div>

      <section className="mt-8 rounded-3xl border border-border bg-white p-6">
        <h2 className="font-display text-xl font-semibold">Traffic over time</h2>
        <p className="mt-1 text-sm text-muted-foreground">
          Daily page views and unique sessions in the selected period.
        </p>
        <div className="mt-6 h-72 w-full">
          {chartData.length > 0 ? (
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={chartData} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} />
                <XAxis dataKey="label" tickLine={false} axisLine={false} fontSize={12} />
                <YAxis allowDecimals={false} tickLine={false} axisLine={false} fontSize={12} />
                <Tooltip />
                <Legend />
                <Bar dataKey="pageViews" name="Page views" fill="#0d9488" radius={[4, 4, 0, 0]} />
                <Bar
                  dataKey="uniqueSessions"
                  name="Unique sessions"
                  fill="#64748b"
                  radius={[4, 4, 0, 0]}
                />
              </BarChart>
            </ResponsiveContainer>
          ) : (
            <div className="flex h-full items-center justify-center text-sm text-muted-foreground">
              No traffic recorded yet for this period.
            </div>
          )}
        </div>
      </section>

      <div className="mt-8 grid gap-6 lg:grid-cols-2">
        <DataTable
          title="Top pages"
          description="Most visited pages and unique sessions per page."
          headers={["Page", "Views", "Sessions"]}
          rows={data.topPages.map((row) => [row.path, row.views, row.uniqueSessions])}
          empty="No page views yet."
        />
        <DataTable
          title="Traffic sources"
          description="Where visitors came from (referrer, UTM, or campaign)."
          headers={["Source", "Sessions"]}
          rows={data.topReferrers.map((row) => [row.source, row.sessions])}
          empty="No referrer data yet."
        />
      </div>

      <div className="mt-8">
        <DataTable
          title="Top clicks"
          description="Buttons and links visitors interact with most."
          headers={["Label", "Destination", "Clicks"]}
          rows={data.topClicks.map((row) => [row.name, row.target, row.count])}
          empty="No clicks tracked yet."
        />
      </div>

      <section className="mt-8 rounded-3xl border border-border bg-white p-6">
        <h2 className="font-display text-xl font-semibold">Recent activity</h2>
        <p className="mt-1 text-sm text-muted-foreground">
          Latest page views and clicks across the site.
        </p>
        <div className="mt-4 overflow-x-auto">
          <table className="w-full min-w-[720px] text-left text-sm">
            <thead>
              <tr className="border-b border-border text-muted-foreground">
                <th className="py-3 pr-4 font-medium">Time</th>
                <th className="py-3 pr-4 font-medium">Type</th>
                <th className="py-3 pr-4 font-medium">Page</th>
                <th className="py-3 pr-4 font-medium">Detail</th>
                <th className="py-3 font-medium">Source</th>
              </tr>
            </thead>
            <tbody>
              {data.recentEvents.length === 0 ? (
                <tr>
                  <td colSpan={5} className="py-8 text-muted-foreground">
                    No events recorded yet. Visit the storefront to generate sample data.
                  </td>
                </tr>
              ) : (
                data.recentEvents.map((event) => (
                  <tr key={event.id} className="border-b border-border/70 last:border-0">
                    <td className="py-3 pr-4 whitespace-nowrap text-muted-foreground">
                      {formatDateTime(event.createdAt)}
                    </td>
                    <td className="py-3 pr-4 capitalize">{event.eventType.replace("_", " ")}</td>
                    <td className="py-3 pr-4 font-mono text-xs">{event.path}</td>
                    <td className="py-3 pr-4">
                      {event.eventType === "click"
                        ? `${event.eventName ?? "Click"} → ${event.targetPath ?? "—"}`
                        : "—"}
                    </td>
                    <td className="py-3 text-muted-foreground">{resolveEventSource(event)}</td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
}

function StatCard({ label, value }: { label: string; value: number }) {
  return (
    <div className="rounded-3xl border border-border bg-white p-6">
      <p className="text-sm text-muted-foreground">{label}</p>
      <p className="mt-2 font-display text-4xl font-bold">{value.toLocaleString("en-IN")}</p>
    </div>
  );
}

function DataTable({
  title,
  description,
  headers,
  rows,
  empty,
}: {
  title: string;
  description: string;
  headers: string[];
  rows: (string | number)[][];
  empty: string;
}) {
  return (
    <section className="rounded-3xl border border-border bg-white p-6">
      <h2 className="font-display text-xl font-semibold">{title}</h2>
      <p className="mt-1 text-sm text-muted-foreground">{description}</p>
      <div className="mt-4 overflow-x-auto">
        <table className="w-full text-left text-sm">
          <thead>
            <tr className="border-b border-border text-muted-foreground">
              {headers.map((header) => (
                <th key={header} className="py-2 pr-4 font-medium">
                  {header}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {rows.length === 0 ? (
              <tr>
                <td colSpan={headers.length} className="py-6 text-muted-foreground">
                  {empty}
                </td>
              </tr>
            ) : (
              rows.map((row, index) => (
                <tr key={`${row[0]}-${index}`} className="border-b border-border/70 last:border-0">
                  {row.map((cell, cellIndex) => (
                    <td
                      key={`${cell}-${cellIndex}`}
                      className={cn(
                        "py-2 pr-4",
                        cellIndex === 0 && "font-mono text-xs sm:text-sm",
                        cellIndex === row.length - 1 && "text-muted-foreground",
                      )}
                    >
                      {cell}
                    </td>
                  ))}
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </section>
  );
}
