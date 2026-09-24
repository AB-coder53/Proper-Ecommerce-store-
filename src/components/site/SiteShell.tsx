"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import dynamic from "next/dynamic";
import { useRouter } from "next/navigation";

import { useCommerce } from "@/components/commerce/CommerceProvider";
import { IstefadaOfferBanner } from "@/components/site/IstefadaOfferBanner";
import { SiteFooter } from "@/components/site/SiteFooter";
import { SiteHeader } from "@/components/site/SiteHeader";

const CartDrawer = dynamic(
  () => import("@/components/commerce/CartDrawer").then((mod) => mod.CartDrawer),
  { ssr: false },
);

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
  const { cartDrawerOpen } = useCommerce();
  const [loadDrawer, setLoadDrawer] = useState(false);
  const ctaLabel = "Shop Collection";

  useEffect(() => {
    if (cartDrawerOpen) setLoadDrawer(true);
  }, [cartDrawerOpen]);

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
      <div className="min-h-screen min-w-0 bg-background text-foreground">
        <IstefadaOfferBanner />
        <SiteHeader />
        {loadDrawer ? <CartDrawer /> : null}
        <main>{children}</main>
        <SiteFooter />
      </div>
    </ReservationContext.Provider>
  );
}
