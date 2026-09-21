"use client";

import { Gift } from "lucide-react";

type StickyBottomNavProps = {
  onScrollToOffer: () => void;
  onShopNow: () => void;
};

export function StickyBottomNav({ onScrollToOffer, onShopNow }: StickyBottomNavProps) {
  return (
    <nav
      aria-label="Quick action checkout navigation"
      className="fixed bottom-0 inset-x-0 z-40 pb-safe bg-background/95 backdrop-blur-xl shadow-[0_-1px_12px_rgba(0,0,0,0.06)] border-t border-border"
    >
      <div className="flex items-center justify-between h-20 max-w-xl mx-auto px-6">
        <div className="flex flex-col justify-center">
          <span className="text-[10px] uppercase tracking-[0.16em] text-muted-foreground font-medium">
            PRIVILEGE GRANT
          </span>
          <div className="flex items-baseline gap-1.5">
            <span className="privilege-serif text-[18px] font-medium text-foreground">
              ₹100 CREDIT
            </span>
            <span className="inline-flex items-center gap-1 text-[10px] text-teal font-bold">
              <span
                aria-hidden="true"
                className="w-1.5 h-1.5 rounded-full bg-teal gold-dot-pulse"
              />
              ACTIVE
            </span>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={onScrollToOffer}
            className="min-h-[44px] px-3.5 py-2 flex items-center justify-center uppercase text-[12px] font-semibold text-foreground hover:text-muted-foreground active:scale-95 transition-all cursor-pointer"
          >
            <Gift className="w-4 h-4 mr-1.5 text-teal" />
            <span>OFFER</span>
          </button>

          <button
            type="button"
            onClick={onShopNow}
            className="min-h-[44px] px-4 py-2 bg-teal text-teal-foreground text-[11px] font-semibold uppercase tracking-[0.14em] hover:bg-teal/90 active:scale-95 transition-all shadow-sm cursor-pointer flex items-center justify-center"
          >
            SHOP NOW
          </button>
        </div>
      </div>
    </nav>
  );
}
