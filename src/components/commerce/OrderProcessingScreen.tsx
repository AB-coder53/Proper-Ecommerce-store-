"use client";

import { Loader2 } from "lucide-react";

export function OrderProcessingScreen({
  title = "Placing your order",
  subtitle = "Please wait — don't close this page.",
}: {
  title?: string | undefined;
  subtitle?: string | undefined;
}) {
  return (
    <div className="flex min-h-[70vh] flex-col items-center justify-center px-5 py-16 text-center">
      <div className="relative size-16" aria-hidden>
        <span className="absolute inset-0 rounded-full border-2 border-gold/25" />
        <Loader2 className="size-16 animate-spin text-gold" strokeWidth={1.5} />
      </div>
      <h1 className="mt-8 font-display text-[1.85rem] font-semibold tracking-tight sm:text-4xl">
        {title}
      </h1>
      <p className="mt-3 max-w-sm text-sm leading-relaxed text-charcoal">{subtitle}</p>
    </div>
  );
}

export function OrderProcessingOverlay({
  title,
  subtitle,
}: {
  title?: string | undefined;
  subtitle?: string | undefined;
}) {
  return (
    <div
      className="fixed inset-0 z-80 flex items-center justify-center bg-ivory/95 px-5 backdrop-blur-sm"
      role="status"
      aria-live="assertive"
      aria-busy="true"
    >
      <OrderProcessingScreen title={title} subtitle={subtitle} />
    </div>
  );
}
