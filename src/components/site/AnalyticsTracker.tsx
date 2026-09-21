"use client";

import { useEffect, useRef } from "react";
import { usePathname } from "next/navigation";

import {
  getAnalyticsAttribution,
  resolveClickLabel,
  resolveClickTarget,
  trackClick,
  trackPageView,
} from "@/lib/analytics.client";

export function AnalyticsTracker() {
  const pathname = usePathname();
  const lastPath = useRef<string | null>(null);

  useEffect(() => {
    getAnalyticsAttribution();
  }, []);

  useEffect(() => {
    if (!pathname || pathname.startsWith("/admin")) return;
    if (lastPath.current === pathname) return;
    lastPath.current = pathname;
    trackPageView(pathname);
  }, [pathname]);

  useEffect(() => {
    const onClick = (event: MouseEvent) => {
      const target = event.target;
      if (!(target instanceof HTMLElement)) return;

      const clickable = target.closest("a[href], [data-track]");
      if (!(clickable instanceof HTMLElement)) return;
      if (clickable.closest("[data-analytics-ignore]")) return;

      const currentPath = window.location.pathname;
      const label = resolveClickLabel(clickable);
      const destination = resolveClickTarget(clickable);
      trackClick(currentPath, label, destination);
    };

    document.addEventListener("click", onClick, true);
    return () => document.removeEventListener("click", onClick, true);
  }, []);

  return null;
}
