"use client";

import { ORDER_STATUSES, ORDER_STATUS_LABELS } from "@/lib/commerce-constants";
import { cn } from "@/lib/utils";

const TERMINAL = new Set(["cancelled", "failed", "returned"]);

export function OrderTimeline({ status }: { status: string }) {
  if (TERMINAL.has(status)) {
    return (
      <div className="rounded-2xl border border-border bg-muted/40 p-4 text-sm">
        <p className="font-semibold">Current Status</p>
        <p className="mt-1 text-muted-foreground">{ORDER_STATUS_LABELS[status] ?? status}</p>
      </div>
    );
  }

  const currentIndex = ORDER_STATUSES.indexOf(status as (typeof ORDER_STATUSES)[number]);

  return (
    <ol className="space-y-3">
      {ORDER_STATUSES.map((step, index) => {
        const done = currentIndex >= 0 && index <= currentIndex;
        const active = index === currentIndex;
        return (
          <li key={step} className="flex items-center gap-3 text-sm">
            <span
              className={cn(
                "flex size-6 items-center justify-center rounded-full border text-[0.65rem] font-bold",
                done
                  ? "border-teal bg-teal text-teal-foreground"
                  : "border-border text-muted-foreground",
                active && "ring-2 ring-teal/30",
              )}
            >
              {done ? "✓" : "○"}
            </span>
            <span className={cn(done ? "text-foreground font-medium" : "text-muted-foreground")}>
              {ORDER_STATUS_LABELS[step]}
            </span>
          </li>
        );
      })}
    </ol>
  );
}
