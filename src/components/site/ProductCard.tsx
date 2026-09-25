"use client";

import Link from "next/link";
import { useMemo, useState } from "react";

import { CatalogPrice } from "@/components/site/CatalogPrice";
import { ColorSwatchRow } from "@/components/site/ColorSwatchRow";
import { ProductBadgeList } from "@/components/site/ProductBadgeList";
import { ProductImage } from "@/components/site/ProductImage";
import { VariantSelectDialog } from "@/components/site/VariantSelectDialog";
import { useIstefadaOffer } from "@/components/site/IstefadaOfferProvider";
import { Button } from "@/components/ui/button";
import { addToCartLabel, useAddToCart } from "@/hooks/use-add-to-cart";
import { productImageForColor } from "@/lib/cart-display";
import type { Product } from "@/lib/catalog-types";
import { resolveDirectCartVariant } from "@/lib/product-variants";
import { productHasPurchasableStock, variantHasStock } from "@/lib/inventory";

export function ProductCard({ product }: { product: Product; badge?: string | undefined }) {
  const { hasOffer } = useIstefadaOffer();
  const direct = resolveDirectCartVariant(product);
  const soldOut = !productHasPurchasableStock(product);
  const directInStock = direct ? variantHasStock(product, direct.color, direct.size) : true;
  const { status, error, run, isBusy } = useAddToCart();
  const [pickerOpen, setPickerOpen] = useState(false);
  const [previewColor, setPreviewColor] = useState(product.colors[0] ?? "");
  const previewImage = useMemo(
    () => (previewColor ? productImageForColor(product, previewColor) : product.image),
    [previewColor, product],
  );

  const onAdd = () => {
    if (isBusy || soldOut) return;
    if (direct) {
      if (!directInStock) return;
      void run(direct);
      return;
    }
    setPickerOpen(true);
  };

  return (
    <article className="flex h-full min-w-0 flex-col rounded-3xl border border-border bg-background p-4 shadow-[0_8px_30px_rgba(0,0,0,0.04)]">
      <Link
        href={`/collection/${product.id}`}
        className="relative overflow-hidden rounded-2xl bg-muted"
      >
        <ProductBadgeList
          product={product}
          className="absolute top-3 right-3 z-10 max-w-[75%] justify-end"
        />
        <ProductImage
          src={previewImage}
          alt={`${product.name} — ${previewColor || product.fabric}`}
          width={1200}
          height={1500}
          sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 33vw"
          className="aspect-[4/5] w-full object-cover object-top transition-transform duration-700 hover:scale-105"
        />
      </Link>

      <ColorSwatchRow
        colors={product.colors}
        selected={previewColor}
        onSelect={setPreviewColor}
        label={`${product.name} colours`}
        className="mt-3"
      />

      <div className="mt-3 flex min-w-0 flex-1 flex-col">
        <div className="flex min-w-0 items-start justify-between gap-3">
          <h3 className="min-w-0 break-words text-base font-bold leading-snug sm:text-lg">
            <Link href={`/collection/${product.id}`} className="hover:text-teal">
              {product.name}
            </Link>
          </h3>
          <div className="shrink-0">
            <CatalogPrice product={product} hasOffer={hasOffer} />
          </div>
        </div>
        <p className="mt-2 line-clamp-2 text-sm leading-relaxed text-muted-foreground">
          {product.tagline}
        </p>
        <div className="mt-5 grid gap-2">
          <Button
            type="button"
            disabled={isBusy || soldOut || (Boolean(direct) && !directInStock)}
            onClick={onAdd}
            className="h-12 w-full rounded-full bg-teal text-xs font-semibold tracking-[0.12em] text-teal-foreground uppercase hover:bg-teal/90"
          >
            {soldOut || (direct && !directInStock) ? "Sold Out" : addToCartLabel(status)}
          </Button>
          {error ? <p className="text-center text-xs text-destructive">{error}</p> : null}
          <Link
            href={`/collection/${product.id}`}
            className="inline-flex h-12 items-center justify-center rounded-full border border-border px-4 text-xs font-semibold leading-none tracking-[0.12em] uppercase transition-colors hover:bg-muted"
          >
            View Details
          </Link>
        </div>
      </div>

      {!direct ? (
        <VariantSelectDialog
          product={product}
          open={pickerOpen}
          onOpenChange={setPickerOpen}
          initialColor={previewColor}
        />
      ) : null}
    </article>
  );
}
