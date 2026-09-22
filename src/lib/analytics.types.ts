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
  daily: { date: string; pageViews: number; uniqueSessions: number; revenue?: number; orders?: number }[];
  recentEvents: AnalyticsEventRow[];
  devices?: { label: string; sessions: number }[];
  commerce?: CommerceAnalytics;
};

export type CommerceAnalytics = {
  revenue: number;
  previousRevenue: number;
  orders: number;
  previousOrders: number;
  aov: number;
  conversionRate: number | null;
  productViews: number;
  addToCart: number;
  checkoutStarted: number;
  topProducts: { name: string; units: number; revenue: number }[];
  sizes: { label: string; units: number; revenue: number }[];
  colours: { label: string; units: number; revenue: number }[];
  lowStock: { product: string; color: string; size: string; stock: number }[];
  outOfStock: number;
  totalUnits: number;
  coupons: { code: string; usage: number; discount: number }[];
  daily: { date: string; revenue: number; orders: number }[];
};
