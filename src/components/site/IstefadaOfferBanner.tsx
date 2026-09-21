"use client";

import { Tag, X } from "lucide-react";
import { useState } from "react";

import { useIstefadaOffer } from "@/hooks/use-istefada-offer";

export function IstefadaOfferBanner() {
  const { hasOffer, promoCode, discountInr } = useIstefadaOffer();
  const [dismissed, setDismissed] = useState(false);

  if (!hasOffer || dismissed) return null;

  return (
    <div className="border-b border-teal/20 bg-accent px-4 py-2.5 text-sm text-accent-foreground">
      <div className="mx-auto flex max-w-6xl items-center justify-between gap-3">
        <div className="flex min-w-0 items-center gap-2">
          <Tag className="size-4 shrink-0 text-teal" aria-hidden />
          <p className="truncate">
            <span className="font-semibold text-teal">₹{discountInr} Istefada reward active.</span>{" "}
            Code <span className="font-mono font-semibold">{promoCode}</span> applies automatically
            at checkout.
          </p>
        </div>
        <button
          type="button"
          onClick={() => setDismissed(true)}
          className="shrink-0 rounded-full p-1 text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
          aria-label="Dismiss offer banner"
        >
          <X className="size-4" />
        </button>
      </div>
    </div>
  );
}
