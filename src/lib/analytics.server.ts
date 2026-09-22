import "server-only";

import { z } from "zod";

import { supabaseAdmin } from "@/integrations/supabase/client.server";
import type { AnalyticsEventRow, AnalyticsSummary } from "@/lib/analytics.types";
import { getCommerceAnalytics } from "@/lib/commerce-analytics.server";

export const analyticsEventSchema = z.object({
  eventType: z.enum(["page_view", "click"]),
  path: z.string().trim().min(1).max(500),
  eventName: z.string().trim().max(200).optional(),
  targetPath: z.string().trim().max(500).optional(),
  sessionId: z.string().trim().min(8).max(80),
  visitorId: z.string().trim().max(80).optional(),
  referrer: z.string().trim().max(2000).optional().nullable(),
  referrerHost: z.string().trim().max(200).optional().nullable(),
  utmSource: z.string().trim().max(120).optional().nullable(),
  utmMedium: z.string().trim().max(120).optional().nullable(),
  utmCampaign: z.string().trim().max(120).optional().nullable(),
  utmContent: z.string().trim().max(120).optional().nullable(),
  utmTerm: z.string().trim().max(120).optional().nullable(),
  entryPath: z.string().trim().max(500).optional().nullable(),
  campaignSource: z.string().trim().max(120).optional().nullable(),
});

export type AnalyticsEventInput = z.infer<typeof analyticsEventSchema>;

export type { AnalyticsEventRow, AnalyticsSummary };

const ANALYTICS_SETUP_SQL = `-- Run in Supabase SQL Editor
CREATE TABLE IF NOT EXISTS public.site_analytics_events (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  event_type TEXT NOT NULL CHECK (event_type IN ('page_view', 'click')),
  path TEXT NOT NULL,
  event_name TEXT,
  target_path TEXT,
  session_id TEXT NOT NULL,
  visitor_id TEXT,
  referrer TEXT,
  referrer_host TEXT,
  utm_source TEXT,
  utm_medium TEXT,
  utm_campaign TEXT,
  utm_content TEXT,
  utm_term TEXT,
  entry_path TEXT,
  campaign_source TEXT,
  user_agent TEXT,
  metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS site_analytics_events_created_at_idx
  ON public.site_analytics_events (created_at DESC);

GRANT ALL ON public.site_analytics_events TO service_role;

ALTER TABLE public.site_analytics_events ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Service role full access" ON public.site_analytics_events;
CREATE POLICY "Service role full access"
  ON public.site_analytics_events
  FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);`;

export function getAnalyticsSetupSql() {
  return ANALYTICS_SETUP_SQL;
}

let analyticsReady: boolean | null = null;
let analyticsCheckedAt = 0;
const ANALYTICS_READY_TTL_MS = 60_000;

export async function isAnalyticsTableReady() {
  const now = Date.now();
  if (analyticsReady === true) return true;
  if (analyticsReady === false && now - analyticsCheckedAt < ANALYTICS_READY_TTL_MS) return false;

  const { error } = await supabaseAdmin.from("site_analytics_events").select("id").limit(1);
  analyticsReady = !error;
  analyticsCheckedAt = now;
  return analyticsReady;
}

export async function recordAnalyticsEvent(input: AnalyticsEventInput, userAgent?: string | null) {
  if (!(await isAnalyticsTableReady())) return;

  const { error } = await supabaseAdmin.from("site_analytics_events").insert({
    event_type: input.eventType,
    path: input.path,
    event_name: input.eventName ?? null,
    target_path: input.targetPath ?? null,
    session_id: input.sessionId,
    visitor_id: input.visitorId ?? null,
    referrer: input.referrer ?? null,
    referrer_host: input.referrerHost ?? null,
    utm_source: input.utmSource ?? null,
    utm_medium: input.utmMedium ?? null,
    utm_campaign: input.utmCampaign ?? null,
    utm_content: input.utmContent ?? null,
    utm_term: input.utmTerm ?? null,
    entry_path: input.entryPath ?? null,
    campaign_source: input.campaignSource ?? null,
    user_agent: userAgent ?? null,
  });

  if (error) {
    if (
      error.message.includes("site_analytics_events") ||
      error.message.includes("Could not find the table")
    ) {
      analyticsReady = false;
      analyticsCheckedAt = Date.now();
      return;
    }
    throw new Error(error.message);
  }
  analyticsReady = true;
}

function resolveTrafficSource(row: {
  referrer_host: string | null;
  utm_source: string | null;
  campaign_source: string | null;
}) {
  if (row.utm_source) return `UTM: ${row.utm_source}`;
  if (row.campaign_source) return `Campaign: ${row.campaign_source}`;
  if (row.referrer_host) return row.referrer_host;
  return "Direct";
}

function mapEventRow(row: {
  id: string;
  event_type: string;
  path: string;
  event_name: string | null;
  target_path: string | null;
  session_id: string;
  visitor_id: string | null;
  referrer_host: string | null;
  utm_source: string | null;
  campaign_source: string | null;
  created_at: string;
}): AnalyticsEventRow {
  return {
    id: row.id,
    eventType: row.event_type as AnalyticsEventRow["eventType"],
    path: row.path,
    eventName: row.event_name,
    targetPath: row.target_path,
    sessionId: row.session_id,
    visitorId: row.visitor_id,
    referrerHost: row.referrer_host,
    utmSource: row.utm_source,
    campaignSource: row.campaign_source,
    createdAt: row.created_at,
  };
}

function deviceFromUa(ua: string | null) {
  const value = (ua ?? "").toLowerCase();
  if (/ipad|tablet/.test(value)) return "Tablet";
  if (/mobi|iphone|android/.test(value)) return "Mobile";
  if (!ua) return "Unknown";
  return "Desktop";
}

export async function getAnalyticsSummary(
  periodDays = 7,
  range?: { from: Date; to: Date },
): Promise<AnalyticsSummary> {
  const to = range?.to ?? new Date();
  const from =
    range?.from ??
    (() => {
      const start = new Date(to);
      start.setHours(0, 0, 0, 0);
      start.setDate(start.getDate() - Math.max(0, periodDays - 1));
      return start;
    })();
  const span = Math.max(to.getTime() - from.getTime(), 24 * 60 * 60 * 1000);
  const previousFrom = new Date(from.getTime() - span);
  const commerce = await getCommerceAnalytics(from, to, previousFrom);
  const commerceDaily = commerce.daily.map((row) => ({
    date: row.date,
    pageViews: 0,
    uniqueSessions: 0,
    revenue: row.revenue,
    orders: row.orders,
  }));

  const ready = await isAnalyticsTableReady();
  if (!ready) {
    return {
      ready: false,
      periodDays,
      uniqueVisitors: 0,
      pageViews: 0,
      clicks: 0,
      topPages: [],
      topReferrers: [],
      topClicks: [],
      daily: commerceDaily,
      recentEvents: [],
      devices: [],
      commerce,
    };
  }

  const { data, error } = await supabaseAdmin
    .from("site_analytics_events")
    .select(
      "id, event_type, path, event_name, target_path, session_id, visitor_id, referrer_host, utm_source, campaign_source, user_agent, created_at",
    )
    .gte("created_at", from.toISOString())
    .lte("created_at", to.toISOString())
    .order("created_at", { ascending: false })
    .limit(15000);

  if (error) {
    throw new Error(error.message);
  }

  const rows = data ?? [];
  const sessions = new Set<string>();
  let pageViews = 0;
  let clicks = 0;

  const pageStats = new Map<string, { views: number; sessions: Set<string> }>();
  const referrerStats = new Map<string, Set<string>>();
  const clickStats = new Map<string, { name: string; target: string; count: number }>();
  const dailyStats = new Map<string, { pageViews: number; sessions: Set<string> }>();
  const deviceStats = new Map<string, Set<string>>();

  for (const row of rows) {
    sessions.add(row.session_id);

    const day = row.created_at.slice(0, 10);
    const daily = dailyStats.get(day) ?? { pageViews: 0, sessions: new Set<string>() };
    daily.sessions.add(row.session_id);

    const device = deviceFromUa((row as { user_agent?: string | null }).user_agent ?? null);
    const deviceSessions = deviceStats.get(device) ?? new Set<string>();
    deviceSessions.add(row.session_id);
    deviceStats.set(device, deviceSessions);

    if (row.event_type === "page_view") {
      pageViews += 1;
      daily.pageViews += 1;

      const page = pageStats.get(row.path) ?? { views: 0, sessions: new Set<string>() };
      page.views += 1;
      page.sessions.add(row.session_id);
      pageStats.set(row.path, page);

      const source = resolveTrafficSource(row);
      const sourceSessions = referrerStats.get(source) ?? new Set<string>();
      sourceSessions.add(row.session_id);
      referrerStats.set(source, sourceSessions);
    }

    if (row.event_type === "click") {
      clicks += 1;
      const name = row.event_name ?? "Click";
      const target = row.target_path ?? "—";
      const key = `${name}::${target}`;
      const existing = clickStats.get(key) ?? { name, target, count: 0 };
      existing.count += 1;
      clickStats.set(key, existing);
    }

    dailyStats.set(day, daily);
  }

  const topPages = [...pageStats.entries()]
    .map(([path, stats]) => ({
      path,
      views: stats.views,
      uniqueSessions: stats.sessions.size,
    }))
    .sort((a, b) => b.views - a.views)
    .slice(0, 10);

  const topReferrers = [...referrerStats.entries()]
    .map(([source, sessionSet]) => ({ source, sessions: sessionSet.size }))
    .sort((a, b) => b.sessions - a.sessions)
    .slice(0, 10);

  const topClicks = [...clickStats.values()].sort((a, b) => b.count - a.count).slice(0, 10);

  const salesByDay = new Map(commerce.daily.map((row) => [row.date, row]));
  const dailyDates = new Set([...dailyStats.keys(), ...salesByDay.keys()]);
  const daily = [...dailyDates]
    .sort((a, b) => a.localeCompare(b))
    .map((date) => ({
      date,
      pageViews: dailyStats.get(date)?.pageViews ?? 0,
      uniqueSessions: dailyStats.get(date)?.sessions.size ?? 0,
      revenue: salesByDay.get(date)?.revenue ?? 0,
      orders: salesByDay.get(date)?.orders ?? 0,
    }));

  let productViews = 0;
  let addToCart = 0;
  let checkoutStarted = 0;
  for (const row of rows) {
    if (row.event_type === "page_view" && /^\/collection\/.+/.test(row.path)) productViews += 1;
    if (row.event_type === "page_view" && row.path.startsWith("/checkout")) checkoutStarted += 1;
    if (
      row.event_type === "click" &&
      /add to cart|added/i.test(row.event_name ?? "")
    ) {
      addToCart += 1;
    }
  }
  commerce.productViews = productViews;
  commerce.addToCart = addToCart;
  commerce.checkoutStarted = checkoutStarted;
  commerce.conversionRate = sessions.size
    ? Math.round((commerce.orders / sessions.size) * 10000) / 100
    : null;

  return {
    ready: true,
    periodDays,
    uniqueVisitors: sessions.size,
    pageViews,
    clicks,
    topPages,
    topReferrers,
    topClicks,
    daily,
    recentEvents: rows.slice(0, 40).map(mapEventRow),
    devices: [...deviceStats.entries()]
      .map(([label, sessionSet]) => ({ label, sessions: sessionSet.size }))
      .sort((a, b) => b.sessions - a.sessions),
    commerce,
  };
}
