"use client";

const SESSION_KEY = "ab_analytics_session";
const VISITOR_KEY = "ab_analytics_visitor";
const ATTRIBUTION_KEY = "ab_analytics_attribution";

type Attribution = {
  referrer: string | null;
  referrerHost: string | null;
  utmSource: string | null;
  utmMedium: string | null;
  utmCampaign: string | null;
  utmContent: string | null;
  utmTerm: string | null;
  campaignSource: string | null;
  entryPath: string;
};

type AnalyticsEventPayload = {
  eventType: "page_view" | "click";
  path: string;
  eventName?: string;
  targetPath?: string;
  sessionId: string;
  visitorId: string;
  referrer?: string | null;
  referrerHost?: string | null;
  utmSource?: string | null;
  utmMedium?: string | null;
  utmCampaign?: string | null;
  utmContent?: string | null;
  utmTerm?: string | null;
  entryPath?: string | null;
  campaignSource?: string | null;
};

function randomId() {
  if (typeof crypto !== "undefined" && typeof crypto.randomUUID === "function") {
    return crypto.randomUUID();
  }
  return `ab-${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;
}

function readStorage(key: string) {
  try {
    return window.sessionStorage.getItem(key);
  } catch {
    return null;
  }
}

function writeStorage(key: string, value: string) {
  try {
    window.sessionStorage.setItem(key, value);
  } catch {
    /* storage unavailable */
  }
}

function readLocal(key: string) {
  try {
    return window.localStorage.getItem(key);
  } catch {
    return null;
  }
}

function writeLocal(key: string, value: string) {
  try {
    window.localStorage.setItem(key, value);
  } catch {
    /* storage unavailable */
  }
}

function parseReferrerHost(referrer: string) {
  if (!referrer) return null;
  try {
    return new URL(referrer).hostname.replace(/^www\./, "");
  } catch {
    return null;
  }
}

export function getAnalyticsSessionId() {
  if (typeof window === "undefined") return "";
  let sessionId = readStorage(SESSION_KEY);
  if (!sessionId) {
    sessionId = randomId();
    writeStorage(SESSION_KEY, sessionId);
  }
  return sessionId;
}

export function getAnalyticsVisitorId() {
  if (typeof window === "undefined") return "";
  let visitorId = readLocal(VISITOR_KEY);
  if (!visitorId) {
    visitorId = randomId();
    writeLocal(VISITOR_KEY, visitorId);
  }
  return visitorId;
}

export function getAnalyticsAttribution(): Attribution {
  if (typeof window === "undefined") {
    return {
      referrer: null,
      referrerHost: null,
      utmSource: null,
      utmMedium: null,
      utmCampaign: null,
      utmContent: null,
      utmTerm: null,
      campaignSource: null,
      entryPath: "/",
    };
  }

  const stored = readStorage(ATTRIBUTION_KEY);
  if (stored) {
    try {
      return JSON.parse(stored) as Attribution;
    } catch {
      /* fall through */
    }
  }

  const params = new URLSearchParams(window.location.search);
  const attribution: Attribution = {
    referrer: document.referrer || null,
    referrerHost: parseReferrerHost(document.referrer),
    utmSource: params.get("utm_source"),
    utmMedium: params.get("utm_medium"),
    utmCampaign: params.get("utm_campaign"),
    utmContent: params.get("utm_content"),
    utmTerm: params.get("utm_term"),
    campaignSource: params.get("from"),
    entryPath: window.location.pathname,
  };

  writeStorage(ATTRIBUTION_KEY, JSON.stringify(attribution));
  return attribution;
}

function buildPayload(
  eventType: AnalyticsEventPayload["eventType"],
  path: string,
  extra: Pick<AnalyticsEventPayload, "eventName" | "targetPath"> = {},
): AnalyticsEventPayload {
  const attribution = getAnalyticsAttribution();
  return {
    eventType,
    path,
    sessionId: getAnalyticsSessionId(),
    visitorId: getAnalyticsVisitorId(),
    referrer: attribution.referrer,
    referrerHost: attribution.referrerHost,
    utmSource: attribution.utmSource,
    utmMedium: attribution.utmMedium,
    utmCampaign: attribution.utmCampaign,
    utmContent: attribution.utmContent,
    utmTerm: attribution.utmTerm,
    entryPath: attribution.entryPath,
    campaignSource: attribution.campaignSource,
    ...extra,
  };
}

export function sendAnalyticsEvent(payload: AnalyticsEventPayload) {
  if (typeof window === "undefined") return;

  const body = JSON.stringify(payload);
  if (typeof navigator !== "undefined" && typeof navigator.sendBeacon === "function") {
    const blob = new Blob([body], { type: "application/json" });
    if (navigator.sendBeacon("/api/analytics", blob)) return;
  }

  void fetch("/api/analytics", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body,
    keepalive: true,
  }).catch(() => {
    /* fire-and-forget */
  });
}

export function trackPageView(path: string) {
  sendAnalyticsEvent(buildPayload("page_view", path));
}

export function trackClick(path: string, eventName: string, targetPath?: string) {
  const extra: { eventName: string; targetPath?: string } = {
    eventName: eventName.slice(0, 200),
  };
  if (targetPath) extra.targetPath = targetPath.slice(0, 500);
  sendAnalyticsEvent(buildPayload("click", path, extra));
}

export function resolveClickLabel(element: HTMLElement) {
  const trackName = element.getAttribute("data-track");
  if (trackName) return trackName;

  const aria = element.getAttribute("aria-label");
  if (aria) return aria;

  const text = element.textContent?.trim().replace(/\s+/g, " ");
  if (text) return text.slice(0, 120);

  return element.tagName.toLowerCase();
}

export function resolveClickTarget(element: HTMLElement) {
  if (element instanceof HTMLAnchorElement && element.href) {
    try {
      const url = new URL(element.href);
      if (url.origin === window.location.origin) {
        return `${url.pathname}${url.search}`;
      }
      return url.href;
    } catch {
      return element.getAttribute("href") ?? undefined;
    }
  }

  const href = element.getAttribute("href");
  return href ?? undefined;
}
