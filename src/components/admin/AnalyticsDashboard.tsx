"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  Bar,
  BarChart,
  CartesianGrid,
  Legend,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

import { Button } from "@/components/ui/button";
import { formatInr } from "@/lib/price";
import { cn } from "@/lib/utils";
import type { AnalyticsSummary } from "@/lib/analytics.types";

type PeriodKey = "today" | "7" | "30" | "month" | "prev" | "custom";

function isoDate(value: Date) {
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${value.getFullYear()}-${pad(value.getMonth() + 1)}-${pad(value.getDate())}`;
}

function rangeFor(key: PeriodKey, customFrom: string, customTo: string) {
  const now = new Date();
  const today = isoDate(now);
  if (key === "today") return { from: today, to: today, days: 1 };
  if (key === "7") return { from: isoDate(new Date(now.getTime() - 6 * 86400000)), to: today, days: 7 };
  if (key === "30") return { from: isoDate(new Date(now.getTime() - 29 * 86400000)), to: today, days: 30 };
  if (key === "month") {
    const from = new Date(now.getFullYear(), now.getMonth(), 1);
    return { from: isoDate(from), to: today, days: now.getDate() };
  }
  if (key === "prev") {
    const from = new Date(now.getFullYear(), now.getMonth() - 1, 1);
    const to = new Date(now.getFullYear(), now.getMonth(), 0);
    return { from: isoDate(from), to: isoDate(to), days: to.getDate() };
  }
  return { from: customFrom || today, to: customTo || today, days: 30 };
}

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

function deltaLabel(current: number, previous: number) {
  if (!previous) return current ? "New" : "—";
  const pct = Math.round(((current - previous) / previous) * 100);
  const sign = pct > 0 ? "+" : "";
  return `${sign}${pct}% vs prior`;
}

export function AnalyticsDashboard({ initial }: { initial: AnalyticsSummary }) {
  const [period, setPeriod] = useState<PeriodKey>("7");
  const [customFrom, setCustomFrom] = useState("");
  const [customTo, setCustomTo] = useState("");
  const [data, setData] = useState(initial);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const skipInitialFetch = useRef(true);

  const load = useCallback(async (key: PeriodKey, fromValue: string, toValue: string) => {
    setLoading(true);
    setError("");
    try {
      const range = rangeFor(key, fromValue, toValue);
      const response = await fetch(
        `/api/admin/analytics?days=${range.days}&from=${range.from}&to=${range.to}`,
        { cache: "no-store" },
      );
      if (!response.ok) throw new Error("Failed to load analytics");
      const summary = (await response.json()) as AnalyticsSummary;
      setData(summary);
    } catch {
      setError("Could not refresh analytics for this period.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (skipInitialFetch.current) {
      skipInitialFetch.current = false;
      return;
    }
    if (period === "custom" && (!customFrom || !customTo)) return;
    void load(period, customFrom, customTo);
  }, [period, customFrom, customTo, load]);

  const commerce = data.commerce;
  const chartData = useMemo(
    () =>
      data.daily.map((row) => ({
        ...row,
        label: formatDate(row.date),
      })),
    [data.daily],
  );

  return (
    <div className={cn(loading && "opacity-70 transition-opacity")}>
      <div className="flex flex-wrap items-center gap-2">
        {(
          [
            ["today", "Today"],
            ["7", "Last 7 days"],
            ["30", "Last 30 days"],
            ["month", "This month"],
            ["prev", "Previous month"],
            ["custom", "Custom"],
          ] as const
        ).map(([key, label]) => (
          <Button
            key={key}
            type="button"
            variant={period === key ? "default" : "outline"}
            className={cn(
              "rounded-full",
              period === key && "bg-teal text-teal-foreground hover:bg-teal/90",
            )}
            onClick={() => setPeriod(key)}
          >
            {label}
          </Button>
        ))}
      </div>
      {period === "custom" ? (
        <div className="mt-3 flex flex-wrap gap-3">
          <label className="text-sm">
            From
            <input
              type="date"
              value={customFrom}
              onChange={(event) => setCustomFrom(event.target.value)}
              className="ml-2 h-10 rounded-full border border-border px-3"
            />
          </label>
          <label className="text-sm">
            To
            <input
              type="date"
              value={customTo}
              onChange={(event) => setCustomTo(event.target.value)}
              className="ml-2 h-10 rounded-full border border-border px-3"
            />
          </label>
        </div>
      ) : null}
      {error ? <p className="mt-3 text-sm text-destructive">{error}</p> : null}

      <div className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard
          label="Revenue"
          value={formatInr(commerce?.revenue ?? 0)}
          hint={commerce ? deltaLabel(commerce.revenue, commerce.previousRevenue) : undefined}
        />
        <StatCard
          label="Completed orders"
          value={(commerce?.orders ?? 0).toLocaleString("en-IN")}
          hint={commerce ? deltaLabel(commerce.orders, commerce.previousOrders) : undefined}
        />
        <StatCard
          label="Average order value"
          value={formatInr(commerce?.aov ?? 0)}
          hint="Revenue / completed orders"
        />
        <StatCard
          label="Conversion rate"
          value={
            commerce?.conversionRate == null ? "—" : `${commerce.conversionRate}%`
          }
          hint={
            commerce?.conversionRate == null
              ? "Needs session traffic data"
              : "Completed orders / sessions"
          }
        />
      </div>

      <section className="mt-8 rounded-3xl border border-border bg-white p-6">
        <h2 className="font-display text-xl font-semibold">Revenue / orders trend</h2>
        <p className="mt-1 text-sm text-muted-foreground">
          Confirmed sales only. Cancelled, failed, and returned orders are excluded.
        </p>
        <div className="mt-6 h-72 w-full">
          {chartData.some((row) => (row.revenue ?? 0) > 0 || (row.orders ?? 0) > 0) ? (
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={chartData} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} />
                <XAxis dataKey="label" tickLine={false} axisLine={false} fontSize={12} />
                <YAxis tickLine={false} axisLine={false} fontSize={12} />
                <Tooltip />
                <Legend />
                <Line type="monotone" dataKey="revenue" name="Revenue" stroke="#0d9488" strokeWidth={2} />
                <Line type="monotone" dataKey="orders" name="Orders" stroke="#64748b" strokeWidth={2} />
              </LineChart>
            </ResponsiveContainer>
          ) : (
            <div className="flex h-full items-center justify-center text-sm text-muted-foreground">
              No sales data available for this period.
            </div>
          )}
        </div>
      </section>

      <div className="mt-8 grid gap-6 lg:grid-cols-2">
        <DataTable
          title="Top products"
          description="Units sold and product revenue from completed orders."
          headers={["Product", "Units", "Revenue"]}
          rows={(commerce?.topProducts ?? []).map((row) => [row.name, row.units, formatInr(row.revenue)])}
          empty="No product sales in this period."
        />
        <DataTable
          title="Low stock"
          description={`Variants at or below the configured threshold. ${commerce?.outOfStock ?? 0} out of stock · ${commerce?.totalUnits ?? 0} units on hand.`}
          headers={["Variant", "Stock"]}
          rows={(commerce?.lowStock ?? []).map((row) => [`${row.product} · ${row.color} / ${row.size}`, row.stock])}
          empty="No low-stock products."
        />
      </div>

      <div className="mt-8 grid gap-6 lg:grid-cols-2">
        <DataTable
          title="Sales by colour"
          description="Units sold using order variant colours."
          headers={["Colour", "Units", "Revenue"]}
          rows={(commerce?.colours ?? []).map((row) => [row.label, row.units, formatInr(row.revenue)])}
          empty="No colour variant sales in this period."
        />
        <DataTable
          title="Sales by size"
          description="Units sold using order variant sizes."
          headers={["Size", "Units", "Revenue"]}
          rows={(commerce?.sizes ?? []).map((row) => [row.label, row.units, formatInr(row.revenue)])}
          empty="No size variant sales in this period."
        />
      </div>

      <div className="mt-8 grid gap-6 lg:grid-cols-2">
        <DataTable
          title="Coupon performance"
          description="Usage counted only on confirmed orders."
          headers={["Coupon", "Usage", "Discount"]}
          rows={(commerce?.coupons ?? []).map((row) => [row.code, row.usage, formatInr(row.discount)])}
          empty="No coupon usage in this period."
        />
        <section className="rounded-3xl border border-border bg-white p-6">
          <h2 className="font-display text-xl font-semibold">Checkout funnel</h2>
          <p className="mt-1 text-sm text-muted-foreground">
            From storefront events already tracked on this site.
          </p>
          {commerce && (commerce.productViews || commerce.addToCart || commerce.checkoutStarted || commerce.orders) ? (
            <dl className="mt-4 grid gap-3 text-sm">
              <FunnelRow label="Product views" value={commerce.productViews} />
              <FunnelRow label="Add to cart" value={commerce.addToCart} />
              <FunnelRow label="Checkout started" value={commerce.checkoutStarted} />
              <FunnelRow label="Orders completed" value={commerce.orders} />
            </dl>
          ) : (
            <p className="mt-6 text-sm text-muted-foreground">No funnel data for this period.</p>
          )}
        </section>
      </div>

      <div className="mt-8 grid gap-4 sm:grid-cols-3">
        <StatCard label="Unique visitors" value={data.uniqueVisitors.toLocaleString("en-IN")} />
        <StatCard label="Page views" value={data.pageViews.toLocaleString("en-IN")} />
        <StatCard label="Clicks tracked" value={data.clicks.toLocaleString("en-IN")} />
      </div>

      <section className="mt-8 rounded-3xl border border-border bg-white p-6">
        <h2 className="font-display text-xl font-semibold">Traffic over time</h2>
        <p className="mt-1 text-sm text-muted-foreground">
          Daily page views and unique sessions in the selected period.
        </p>
        <div className="mt-6 h-72 w-full">
          {chartData.some((row) => row.pageViews > 0) ? (
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

      <div className="mt-8 grid gap-6 lg:grid-cols-2">
        <DataTable
          title="Top clicks"
          description="Buttons and links visitors interact with most."
          headers={["Label", "Destination", "Clicks"]}
          rows={data.topClicks.map((row) => [row.name, row.target, row.count])}
          empty="No clicks tracked yet."
        />
        <DataTable
          title="Devices"
          description="Unique sessions by device class from recorded user agents."
          headers={["Device", "Sessions"]}
          rows={(data.devices ?? []).map((row) => [row.label, row.sessions])}
          empty="No device data for this period."
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

function StatCard({
  label,
  value,
  hint,
}: {
  label: string;
  value: string;
  hint?: string | undefined;
}) {
  return (
    <div className="rounded-3xl border border-border bg-white p-6">
      <p className="text-sm text-muted-foreground">{label}</p>
      <p className="mt-2 font-display text-3xl font-bold sm:text-4xl">{value}</p>
      {hint ? <p className="mt-1 text-xs text-muted-foreground">{hint}</p> : null}
    </div>
  );
}

function FunnelRow({ label, value }: { label: string; value: number }) {
  return (
    <div className="flex items-center justify-between rounded-2xl border border-border px-4 py-3">
      <dt>{label}</dt>
      <dd className="font-semibold">{value.toLocaleString("en-IN")}</dd>
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
