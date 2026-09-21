export type AnalyticsEventRow = {
  id: string;
  eventType: "page_view" | "click";
  path: string;
  eventName: string | null;
  targetPath: string | null;
  sessionId: string;
  visitorId: string | null;
  referrerHost: string | null;
  utmSource: string | null;
  campaignSource: string | null;
  createdAt: string;
};

export type AnalyticsSummary = {
  ready: boolean;
  periodDays: number;
  uniqueVisitors: number;
  pageViews: number;
  clicks: number;
  topPages: { path: string; views: number; uniqueSessions: number }[];
  topReferrers: { source: string; sessions: number }[];
  topClicks: { name: string; target: string; count: number }[];
  daily: { date: string; pageViews: number; uniqueSessions: number }[];
  recentEvents: AnalyticsEventRow[];
};
