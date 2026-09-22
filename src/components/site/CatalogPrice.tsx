import type { Product } from "@/lib/catalog-types";
import { getDiscountedPriceLabel } from "@/lib/istefada-offer";
import { catalogPriceParts } from "@/lib/price";
import { cn } from "@/lib/utils";

export function CatalogPrice({
  product,
  hasOffer = false,
  align = "right",
  size = "card",
}: {
  product: Product;
  hasOffer?: boolean;
  align?: "left" | "right";
  size?: "card" | "detail";
}) {
  const parts = catalogPriceParts(product);
  const istefada = getDiscountedPriceLabel(product.price);
  const showIstefada = hasOffer && istefada.final > 0 && istefada.final < istefada.original;
  const strikeLabel = showIstefada
    ? parts.hasCompare
      ? parts.compareAtLabel
      : istefada.originalLabel
    : parts.hasCompare
      ? parts.compareAtLabel
      : "";
  const currentLabel = showIstefada ? istefada.finalLabel : parts.sellingLabel;

  return (
    <div className={cn(align === "right" ? "text-right" : "text-left")}>
      {strikeLabel ? (
        <p
          className={cn(
            "text-muted-foreground line-through",
            size === "detail" ? "text-sm" : "text-xs",
          )}
        >
          <span className="sr-only">Original price </span>
          {strikeLabel}
        </p>
      ) : null}
      <p
        className={cn(
          "font-semibold text-teal",
          size === "detail" ? "text-2xl" : "text-sm",
        )}
      >
        <span className="sr-only">Selling price </span>
        {currentLabel}
      </p>
      {showIstefada ? (
        <p className="mt-1 text-xs text-muted-foreground">
          Istefada {istefada.originalLabel} → {istefada.finalLabel}
        </p>
      ) : null}
    </div>
  );
}
