import { Truck } from "lucide-react";

import type { DeliveryEstimate } from "@/lib/shipping";

export function ProductDeliveryEstimate({ estimate }: { estimate: DeliveryEstimate }) {
  return (
    <div className="mt-6 flex items-start gap-3 rounded-2xl border border-border bg-background px-4 py-3 text-sm">
      <Truck className="mt-0.5 size-4 shrink-0 text-teal" aria-hidden />
      <p className={estimate.available ? "font-medium" : "text-muted-foreground"}>
        {estimate.label}
      </p>
    </div>
  );
}
