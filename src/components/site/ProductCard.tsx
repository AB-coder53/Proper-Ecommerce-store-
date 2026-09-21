"use client";

import Link from "next/link";

import { useCommerce } from "@/components/commerce/CommerceProvider";
import { useIstefadaOffer } from "@/components/site/IstefadaOfferProvider";
import { Button } from "@/components/ui/button";
import type { Product } from "@/lib/catalog-types";
import { getDiscountedPriceLabel } from "@/lib/istefada-offer";

export function ProductCard({ product, badge }: { product: Product; badge?: string | undefined }) {
  const { addToCart } = useCommerce();
  const { hasOffer } = useIstefadaOffer();
  const label = badge || product.badge || "";
  const defaultSize = product.sizes[0] ?? "M";
  const defaultColor = product.colors[0] ?? "Default";
  const priced = getDiscountedPriceLabel(product.price);

  return (
    <article className="flex h-full flex-col rounded-3xl border border-border bg-background p-4 shadow-[0_8px_30px_rgba(0,0,0,0.04)]">
      <Link
        href={`/collection/${product.id}`}
        className="relative overflow-hidden rounded-2xl bg-muted"
      >
        {label ? (
          <span className="absolute top-3 right-3 z-10 rounded-full bg-white px-3 py-1 text-[0.65rem] font-semibold tracking-[0.08em] text-foreground uppercase shadow-sm">
            {label}
          </span>
        ) : null}
        <img
          src={product.image}
          alt={`${product.name} — ${product.fabric}`}
          width={800}
          height={1000}
          className="aspect-[4/5] w-full object-cover object-top transition-transform duration-700 hover:scale-105"
        />
      </Link>

      <div className="mt-4 flex flex-1 flex-col">
        <div className="flex items-start justify-between gap-3">
          <h3 className="min-w-0 text-base font-bold leading-snug sm:text-lg">
            <Link href={`/collection/${product.id}`} className="hover:text-teal">
              {product.name}
            </Link>
          </h3>
          {hasOffer && priced.final > 0 ? (
            <div className="shrink-0 text-right">
              <p className="text-xs text-muted-foreground line-through">{priced.originalLabel}</p>
              <p className="text-sm font-semibold text-teal">{priced.finalLabel}</p>
            </div>
          ) : (
            <p className="shrink-0 pt-0.5 text-sm font-semibold text-teal">{product.price}</p>
          )}
        </div>
        <p className="mt-2 line-clamp-2 text-sm leading-relaxed text-muted-foreground">
          {product.tagline}
        </p>
        <div className="mt-5 grid gap-2">
          <Button
            onClick={() =>
              void addToCart({
                productId: product.id,
                size: defaultSize,
                color: defaultColor,
                quantity: 1,
              })
            }
            className="h-11 w-full rounded-full bg-teal text-xs font-semibold tracking-[0.12em] text-teal-foreground uppercase hover:bg-teal/90"
          >
            Add to Cart
          </Button>
          <Link
            href={`/collection/${product.id}`}
            className="inline-flex h-10 items-center justify-center rounded-full border border-border text-xs font-semibold tracking-[0.12em] uppercase transition-colors hover:bg-muted"
          >
            View Details
          </Link>
        </div>
      </div>
    </article>
  );
}
