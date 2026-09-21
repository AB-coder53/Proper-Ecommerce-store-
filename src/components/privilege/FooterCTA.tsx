"use client";

import { ArrowRight } from "lucide-react";

import { ASSETS } from "@/lib/privilege/content";

type FooterCTAProps = {
  onShopNow: () => void;
};

export function FooterCTA({ onShopNow }: FooterCTAProps) {
  return (
    <footer
      aria-labelledby="footer-grant-heading"
      className="flex flex-col px-6 py-14 text-center bg-ink text-ink-foreground relative overflow-hidden"
    >
      <div className="max-w-xl mx-auto w-full flex flex-col items-center">
        <div className="w-12 h-12 mb-4 p-1 bg-white/10 flex items-center justify-center rounded-xl transition-transform duration-500 hover:rotate-6">
          <img
            src={ASSETS.crestDark}
            alt="AB Collection crest"
            className="w-full h-full object-contain filter invert opacity-90"
            loading="lazy"
          />
        </div>

        <span className="text-[10px] font-semibold text-teal uppercase tracking-[0.16em] block mb-1">
          CLAIM YOUR FIRST PIECE
        </span>

        <h2
          id="footer-grant-heading"
          className="privilege-serif text-[32px] sm:text-[36px] text-white uppercase tracking-tight mb-2 font-normal"
        >
          YOUR ₹100 IS STILL WAITING.
        </h2>

        <p className="text-[14px] leading-relaxed text-white/70 max-w-xs mx-auto mb-6">
          Head to the main store — your Istefada reward applies automatically when you reserve your
          piece.
        </p>

        <button
          type="button"
          onClick={onShopNow}
          className="group w-full max-w-xs min-h-[50px] mx-auto py-3.5 px-6 bg-teal text-teal-foreground text-[12px] font-semibold tracking-[0.14em] uppercase flex items-center justify-center gap-2 shadow-md hover:bg-teal/90 active:scale-[0.98] transition-all cursor-pointer rounded-full"
        >
          <span>SHOP NOW • REDEEM ₹100</span>
          <ArrowRight className="w-4 h-4 transition-transform duration-300 group-hover:translate-x-1.5" />
        </button>

        <span className="text-[10px] text-white/50 uppercase tracking-[0.14em] mt-8 font-medium">
          ₹100 OFF • FIRST ORDER • ONE-TIME REWARD • AB COLLECTION
        </span>
      </div>
    </footer>
  );
}
