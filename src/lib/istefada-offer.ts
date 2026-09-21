import { formatInr, parsePriceInr } from "@/lib/price";

/** Legacy cookie name — cleared by middleware; offer is session-based. */
export const ISTEFADA_OFFER_COOKIE = "abc_istefada_offer";
export const ISTEFADA_PROMO_CODE = "ISTEFADA100";
export const ISTEFADA_DISCOUNT_INR = 100;
export const ISTEFADA_SOURCE = "istefada";
/** Query param: /?from=istefada activates the offer for this browser session. */
export const ISTEFADA_FROM_QUERY = "istefada";

export type IstefadaPriceLine = {
  unitPrice: number;
  quantity: number;
};

export function applyIstefadaDiscount(originalPrice: number, discount = ISTEFADA_DISCOUNT_INR) {
  return Math.max(originalPrice - discount, 0);
}

export function istefadaUnitOff(originalPrice: number, discount = ISTEFADA_DISCOUNT_INR) {
  if (originalPrice <= 0) return 0;
  return Math.min(discount, originalPrice);
}

/** ₹100 off each unit, not a single cut on the cart total. */
export function resolveIstefadaDiscount(promoCode: string | undefined, lines: IstefadaPriceLine[]) {
  if (promoCode?.trim().toUpperCase() !== ISTEFADA_PROMO_CODE) return 0;
  return lines.reduce((sum, line) => {
    const quantity = Math.max(0, line.quantity);
    return sum + istefadaUnitOff(line.unitPrice) * quantity;
  }, 0);
}

export function getDiscountedPriceLabel(catalogPrice: string) {
  const original = parsePriceInr(catalogPrice);
  if (!original) {
    return { original: 0, final: 0, originalLabel: catalogPrice, finalLabel: catalogPrice };
  }
  const final = applyIstefadaDiscount(original);
  return {
    original,
    final,
    originalLabel: catalogPrice,
    finalLabel: formatInr(final),
  };
}
