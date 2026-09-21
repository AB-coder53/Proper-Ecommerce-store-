"use client";

import dynamic from "next/dynamic";
import type { ReactNode } from "react";
import { usePathname } from "next/navigation";

import { CommerceProvider } from "@/components/commerce/CommerceProvider";
import { CommerceToaster } from "@/components/commerce/CommerceToaster";
import { CatalogProvider } from "@/components/site/CatalogProvider";
import {
  IstefadaOfferActivation,
  IstefadaOfferProvider,
} from "@/components/site/IstefadaOfferProvider";
import { SiteShell } from "@/components/site/SiteShell";
import type { Catalog } from "@/lib/catalog-types";

const AnalyticsTracker = dynamic(
  () => import("@/components/site/AnalyticsTracker").then((m) => m.AnalyticsTracker),
  { ssr: false },
);

export function AppProviders({ children, catalog }: { children: ReactNode; catalog: Catalog }) {
  const pathname = usePathname();
  const isAdmin = pathname?.startsWith("/admin");
  const isCampaignLanding = pathname?.startsWith("/istefada") || pathname?.startsWith("/privilege");

  if (isAdmin) return <>{children}</>;

  if (isCampaignLanding) {
    return (
      <>
        <AnalyticsTracker />
        {children}
      </>
    );
  }

  return (
    <IstefadaOfferProvider>
      <AnalyticsTracker />
      <IstefadaOfferActivation />
      <CatalogProvider initial={catalog}>
        <CommerceProvider>
          <SiteShell>{children}</SiteShell>
          <CommerceToaster />
        </CommerceProvider>
      </CatalogProvider>
    </IstefadaOfferProvider>
  );
}
