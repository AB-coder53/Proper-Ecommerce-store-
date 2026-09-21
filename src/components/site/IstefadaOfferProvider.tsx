"use client";

import { usePathname, useRouter, useSearchParams } from "next/navigation";
import {
  createContext,
  Suspense,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from "react";

import {
  ISTEFADA_DISCOUNT_INR,
  ISTEFADA_FROM_QUERY,
  ISTEFADA_PROMO_CODE,
} from "@/lib/istefada-offer";

const STORAGE_KEY = "ab_istefada_offer";

type IstefadaOfferContextValue = {
  hasOffer: boolean;
  promoCode: string;
  discountInr: number;
  activateOffer: () => void;
};

const IstefadaOfferContext = createContext<IstefadaOfferContextValue | null>(null);

function readStoredOffer() {
  try {
    return window.sessionStorage.getItem(STORAGE_KEY) === "1";
  } catch {
    return false;
  }
}

function writeStoredOffer() {
  try {
    window.sessionStorage.setItem(STORAGE_KEY, "1");
  } catch {
    /* storage unavailable */
  }
}

export function useIstefadaOffer() {
  const ctx = useContext(IstefadaOfferContext);
  if (!ctx) {
    return {
      hasOffer: false,
      promoCode: ISTEFADA_PROMO_CODE,
      discountInr: ISTEFADA_DISCOUNT_INR,
      activateOffer: () => {},
    };
  }
  return ctx;
}

export function IstefadaOfferProvider({ children }: { children: ReactNode }) {
  const [hasOffer, setHasOffer] = useState(false);

  useEffect(() => {
    if (readStoredOffer()) setHasOffer(true);
  }, []);

  const activateOffer = useCallback(() => {
    writeStoredOffer();
    setHasOffer(true);
  }, []);

  const value = useMemo(
    () => ({
      hasOffer,
      promoCode: ISTEFADA_PROMO_CODE,
      discountInr: ISTEFADA_DISCOUNT_INR,
      activateOffer,
    }),
    [hasOffer, activateOffer],
  );

  return <IstefadaOfferContext.Provider value={value}>{children}</IstefadaOfferContext.Provider>;
}

function IstefadaOfferActivationInner() {
  const searchParams = useSearchParams();
  const pathname = usePathname();
  const router = useRouter();
  const { activateOffer } = useIstefadaOffer();
  const handled = useRef(false);

  useEffect(() => {
    if (handled.current) return;
    if (searchParams.get("from") !== ISTEFADA_FROM_QUERY) return;

    handled.current = true;
    activateOffer();
    const next = new URLSearchParams(searchParams.toString());
    next.delete("from");
    const query = next.toString();
    router.replace(query ? `${pathname}?${query}` : pathname || "/", { scroll: false });
  }, [searchParams, pathname, activateOffer, router]);

  return null;
}

export function IstefadaOfferActivation() {
  return (
    <Suspense fallback={null}>
      <IstefadaOfferActivationInner />
    </Suspense>
  );
}
