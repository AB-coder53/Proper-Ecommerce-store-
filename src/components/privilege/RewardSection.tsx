"use client";

import { ArrowRight, Check, CheckCircle2, Gift } from "lucide-react";
import { useState } from "react";

import { ASSETS, PROMO_CODE } from "@/lib/privilege/content";

type RewardSectionProps = {
  onShopNow: () => void;
};

export function RewardSection({ onShopNow }: RewardSectionProps) {
  const [copied, setCopied] = useState(false);

  const handleCopy = () => {
    void navigator.clipboard?.writeText(PROMO_CODE);
    setCopied(true);
    setTimeout(() => setCopied(false), 2500);
  };

  return (
    <section
      aria-labelledby="hero-grant-heading"
      className="flex flex-col px-6 pt-6 pb-12 items-center text-center max-w-xl mx-auto w-full"
    >
      <div className="w-16 h-16 mb-4 p-1 bg-muted flex items-center justify-center rounded-xl transition-transform duration-500 hover:rotate-2">
        <img
          src={ASSETS.crestLight}
          alt="AB Collection monogram crest"
          className="w-full h-full object-contain mix-blend-multiply"
        />
      </div>

      <div className="inline-flex items-center gap-2 px-4 py-1.5 bg-accent mb-5 transition-colors duration-300 hover:bg-accent/80 rounded-full">
        <span aria-hidden="true" className="w-1.5 h-1.5 rounded-full bg-teal gold-dot-pulse" />
        <span className="text-[10px] tracking-[0.16em] text-accent-foreground font-semibold uppercase">
          ISTEFADA ILMIYAH SPECIAL • SURAT
        </span>
      </div>

      <div className="relative w-full bg-ink text-ink-foreground p-6 shadow-md mb-7 overflow-hidden text-left reward-card-unlock transition-all duration-300 hover:shadow-xl rounded-2xl">
        <div className="card-shimmer-sweep" />
        <div className="absolute -right-12 -top-12 w-32 h-32 rounded-full bg-teal/20 pointer-events-none blur-xl" />

        <div className="flex items-center justify-between mb-5 relative z-10">
          <span className="text-[10px] tracking-[0.16em] text-teal uppercase font-semibold">
            EXCLUSIVE GRANT #0942
          </span>
          <div className="flex items-center gap-1.5 bg-white/10 px-2 py-0.5 reward-badge-unlock rounded">
            <CheckCircle2 className="w-3.5 h-3.5 text-teal" />
            <span className="text-[9px] tracking-wider text-white uppercase font-semibold">
              UNLOCKED
            </span>
          </div>
        </div>

        <div className="flex items-baseline justify-between mb-3 relative z-10">
          <div className="flex items-baseline gap-2">
            <span className="privilege-serif text-[38px] tracking-tight text-white reward-amount-gleam leading-none">
              ₹100
            </span>
            <span className="text-[10px] tracking-[0.16em] text-teal uppercase font-semibold">
              REWARD
            </span>
          </div>
          <Gift className="w-8 h-8 text-teal opacity-80 transition-transform duration-300 hover:rotate-12" />
        </div>

        <div className="bg-white/10 h-px w-full my-3 relative z-10" />

        <div className="flex items-center justify-between text-white/70 relative z-10 text-[13px]">
          <span>Auto-applied when you shop on the main site</span>
          <span className="text-[10px] text-teal uppercase tracking-wider font-semibold">
            CODE: {PROMO_CODE.toLowerCase()}
          </span>
        </div>
      </div>

      <div className="flex flex-col items-center">
        <h1
          id="hero-grant-heading"
          className="privilege-serif text-[34px] sm:text-[38px] text-foreground tracking-tight mb-1 uppercase font-normal"
        >
          YOU FOUND ₹100.
        </h1>
        <p className="privilege-serif text-[20px] text-muted-foreground italic mb-3">
          Your reward is unlocked.
        </p>
        <p className="text-[15px] leading-relaxed text-muted-foreground max-w-xs mb-6">
          Tap Shop Now to browse AB Collection. Your ₹100 Istefada savings apply on every product
          automatically at checkout.
        </p>

        <button
          type="button"
          onClick={handleCopy}
          aria-label={`Copy voucher code ${PROMO_CODE} to clipboard`}
          className="flex items-center justify-between w-full max-w-xs min-h-[50px] bg-muted px-4 py-2 mb-6 cursor-pointer transition-all duration-300 hover:bg-muted/80 active:scale-[0.98] border border-border text-left group rounded-xl"
        >
          <div className="flex items-center gap-2.5 text-left min-w-0">
            {copied ? (
              <Check className="w-5 h-5 text-foreground flex-shrink-0 transition-transform duration-300 scale-110" />
            ) : (
              <CheckCircle2 className="w-5 h-5 text-teal flex-shrink-0 transition-transform duration-300 group-hover:scale-105" />
            )}
            <div className="flex flex-col truncate">
              <span className="text-[10px] font-semibold tracking-wider text-foreground uppercase truncate">
                VOUCHER: {PROMO_CODE}
              </span>
              <span className="text-[12px] text-muted-foreground">
                {copied ? "Code copied to clipboard!" : "Tap to copy code"}
              </span>
            </div>
          </div>
          <span
            className={`text-[10px] uppercase tracking-wider flex-shrink-0 ml-2 font-bold px-2 py-1 transition-colors duration-200 ${
              copied ? "text-foreground bg-background" : "text-teal"
            }`}
          >
            {copied ? "COPIED" : "COPY"}
          </span>
        </button>

        <button
          type="button"
          onClick={onShopNow}
          className="group w-full max-w-xs min-h-[50px] py-3.5 px-6 bg-teal text-teal-foreground text-[12px] font-semibold tracking-[0.14em] uppercase flex items-center justify-center gap-2 shadow-md hover:bg-teal/90 active:scale-[0.98] transition-all cursor-pointer rounded-full"
        >
          <span>SHOP NOW</span>
          <ArrowRight className="w-4 h-4 transition-transform duration-300 group-hover:translate-x-1.5" />
        </button>

        <span className="text-[10px] text-muted-foreground uppercase tracking-wider mt-4 font-medium">
          VALID ON YOUR FIRST ORDER • ONE-TIME USE • TERMS APPLY
        </span>
      </div>
    </section>
  );
}
