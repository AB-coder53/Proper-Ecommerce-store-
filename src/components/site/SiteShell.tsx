"use client";

import { createContext, useCallback, useContext, useMemo, type ReactNode } from "react";
import { useRouter } from "next/navigation";

import { IstefadaOfferBanner } from "@/components/site/IstefadaOfferBanner";
import { SiteFooter } from "@/components/site/SiteFooter";
import { SiteHeader } from "@/components/site/SiteHeader";

type ReservationContextValue = {
  unlocked: boolean;
  ctaLabel: string;
  openEarlyAccess: () => void;
  openReservation: () => void;
  primaryCta: () => void;
};

const ReservationContext = createContext<ReservationContextValue | null>(null);

export function useReservation() {
  const ctx = useContext(ReservationContext);
  if (!ctx) throw new Error("useReservation must be used within SiteShell");
  return ctx;
}

export function SiteShell({ children }: { children: ReactNode }) {
  const router = useRouter();
  const ctaLabel = "Shop Collection";

  const goShop = useCallback(() => {
    router.push("/collection");
  }, [router]);

  const value = useMemo(
    () => ({
      unlocked: true,
      ctaLabel,
      openEarlyAccess: goShop,
      openReservation: goShop,
      primaryCta: goShop,
    }),
    [goShop],
  );

  return (
    <ReservationContext.Provider value={value}>
      <div className="min-h-screen bg-background text-foreground">
        <IstefadaOfferBanner />
        <SiteHeader />
        <main>{children}</main>
        <SiteFooter />
      </div>
    </ReservationContext.Provider>
  );
}
