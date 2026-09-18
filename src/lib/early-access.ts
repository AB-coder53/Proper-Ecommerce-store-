export const EARLY_ACCESS_UNLOCKED_KEY = "earlyAccessUnlocked";
export const EARLY_ACCESS_EMAIL_KEY = "earlyAccessEmail";
export const EARLY_ACCESS_EVENT = "early-access-change";

export function readEarlyAccessEmail(): string {
  if (typeof window === "undefined") return "";
  try {
    return window.localStorage.getItem(EARLY_ACCESS_EMAIL_KEY) ?? "";
  } catch {
    return "";
  }
}

export function isEarlyAccessUnlocked(): boolean {
  // Storefront is live — no early-access gate.
  return true;
}

export function saveEarlyAccess(email: string) {
  try {
    window.localStorage.setItem(EARLY_ACCESS_UNLOCKED_KEY, "true");
    window.localStorage.setItem(EARLY_ACCESS_EMAIL_KEY, email);
  } catch {
    /* storage unavailable */
  }
  try {
    window.dispatchEvent(new Event(EARLY_ACCESS_EVENT));
  } catch {
    /* no window */
  }
}

type AnalyticsWindow = Window & { dataLayer?: unknown[]; gtag?: (...args: unknown[]) => void };

/** Fire-and-forget event; no-op when no analytics platform is present. */
export function trackEvent(name: string, params: Record<string, unknown> = {}) {
  if (typeof window === "undefined") return;
  const w = window as AnalyticsWindow;
  if (typeof w.gtag === "function") w.gtag("event", name, params);
  else if (Array.isArray(w.dataLayer)) w.dataLayer.push({ event: name, ...params });
}
