import type { ReactNode } from "react";

import { cn } from "@/lib/utils";

const TONES = {
  success: "border-emerald-200 bg-emerald-50 text-emerald-800",
  warning: "border-amber-200 bg-amber-50 text-amber-800",
  danger: "border-red-200 bg-red-50 text-red-700",
  info: "border-sky-200 bg-sky-50 text-sky-800",
  transit: "border-indigo-200 bg-indigo-50 text-indigo-800",
  neutral: "border-stone-200 bg-stone-100 text-stone-600",
} as const;

export type StatusTone = keyof typeof TONES;

const TONE_BY_STATUS: Record<string, StatusTone> = {
  paid: "success",
  delivered: "success",
  approved: "success",
  active: "success",
  featured: "success",
  "in stock": "success",
  pending: "warning",
  "payment pending": "warning",
  processing: "warning",
  packed: "warning",
  scheduled: "warning",
  "low stock": "warning",
  failed: "danger",
  "payment failed": "danger",
  cancelled: "danger",
  canceled: "danger",
  returned: "danger",
  rejected: "danger",
  expired: "danger",
  exhausted: "danger",
  removed: "danger",
  "out of stock": "danger",
  blocked: "danger",
  disabled: "danger",
  suspended: "danger",
  placed: "info",
  confirmed: "info",
  refunded: "info",
  shipped: "transit",
  "out for delivery": "transit",
  inactive: "neutral",
  archived: "neutral",
  standard: "neutral",
  draft: "neutral",
};

export function statusTone(status: string): StatusTone {
  const key = status.trim().toLowerCase().replace(/[_-]+/g, " ");
  return TONE_BY_STATUS[key] ?? "neutral";
}

export function statusToneClass(status: string) {
  return TONES[statusTone(status)];
}

const DOTS: Record<StatusTone, string> = {
  success: "bg-emerald-500",
  warning: "bg-amber-500",
  danger: "bg-red-500",
  info: "bg-sky-500",
  transit: "bg-indigo-500",
  neutral: "bg-stone-400",
};

export function statusDotClass(status: string) {
  return DOTS[statusTone(status)];
}

export function StatusPill({
  status = "",
  tone,
  children,
  className,
}: {
  status?: string;
  tone?: StatusTone;
  children?: ReactNode;
  className?: string;
}) {
  return (
    <span
      className={cn(
        "inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-medium whitespace-nowrap capitalize",
        TONES[tone ?? statusTone(status)],
        className,
      )}
    >
      {children ?? status}
    </span>
  );
}
