"use client";

import { useEffect, useMemo, useState } from "react";

import { ProductVariantPicker } from "@/components/site/ProductVariantPicker";
import { ProductImage } from "@/components/site/ProductImage";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogTitle } from "@/components/ui/dialog";
import { addToCartLabel, useAddToCart } from "@/hooks/use-add-to-cart";
import type { Product } from "@/lib/catalog-types";
import { getDiscountedPriceLabel } from "@/lib/istefada-offer";
import { colorToImageIndex } from "@/lib/product-colors";
import { isValidProductVariant, productVariantOptions } from "@/lib/product-variants";
import { availableStock, variantHasStock } from "@/lib/inventory";
import { useIstefadaOffer } from "@/components/site/IstefadaOfferProvider";

export function VariantSelectDialog({
  product,
  open,
  onOpenChange,
  initialColor = "",
}: {
  product: Product;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  initialColor?: string;
}) {
  const images = product.images?.length ? product.images : [product.image];
  const options = productVariantOptions(product);
  const { hasOffer } = useIstefadaOffer();
  const priced = getDiscountedPriceLabel(product.price);
  const { status, error, run, isBusy } = useAddToCart();
  const [color, setColor] = useState(initialColor);
  const [size, setSize] = useState("");

  useEffect(() => {
    if (!open) return;
    setColor(initialColor || "");
    setSize("");
  }, [open, initialColor]);

  const preview = useMemo(() => {
    if (!color) return product.image;
    const src = images[colorToImageIndex(color, product.colors, images, product.colorImages)] ?? "";
    return src.trim() ? src : product.image;
  }, [color, images, product.colorImages, product.colors, product.image]);

  const canAdd = isValidProductVariant(product, color, size);
  const stock = availableStock(product, color, size);
  const inStock = !canAdd || variantHasStock(product, color, size);

  const submit = async () => {
    if (!canAdd || isBusy || !inStock) return;
    const result = await run({
      productId: product.id,
      color: color || options.soleColor || "Default",
      size: size || options.soleSize || "OS",
      quantity: 1,
    });
    if (result.ok) onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="flex max-h-[min(90vh,calc(100dvh-2rem))] w-[min(100%,calc(100vw-1.5rem))] max-w-md flex-col gap-0 overflow-hidden p-0 sm:rounded-2xl">
        <div className="shrink-0 border-b border-border px-5 py-4 pr-12">
          <DialogTitle className="font-display text-xl">Select options</DialogTitle>
          <DialogDescription className="mt-1 text-sm text-muted-foreground">
            {product.name}
          </DialogDescription>
        </div>
        <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain px-5 py-4">
          <ProductImage
            src={preview}
            alt={product.name}
            width={512}
            height={640}
            sizes="(max-width: 430px) 80vw, 256px"
            className="mx-auto aspect-[4/5] w-full max-w-[16rem] rounded-2xl object-cover object-top"
          />
          <div className="mt-4">
            {hasOffer && priced.final > 0 ? (
              <div>
                <p className="text-xs text-muted-foreground line-through">{priced.originalLabel}</p>
                <p className="text-lg font-semibold text-teal">{priced.finalLabel}</p>
              </div>
            ) : (
              <p className="text-lg font-semibold text-teal">{product.price}</p>
            )}
          </div>
          <div className="mt-5">
            <ProductVariantPicker
              product={product}
              selectedColor={color}
              selectedSize={size}
              onColorChange={setColor}
              onSizeChange={setSize}
            />
          </div>
          {!canAdd ? (
            <p className="mt-4 text-xs text-muted-foreground">
              Select {options.requiresColor && !color ? "a colour" : ""}
              {options.requiresColor && !color && options.requiresSize && !size ? " and " : ""}
              {options.requiresSize && !size ? "a size" : ""} to continue.
            </p>
          ) : !inStock ? (
            <p className="mt-4 text-sm text-destructive">
              This product/variant is currently out of stock.
            </p>
          ) : stock > 0 && stock <= 5 ? (
            <p className="mt-4 text-xs text-muted-foreground">Only {stock} left</p>
          ) : null}
          {error ? <p className="mt-3 text-sm text-destructive">{error}</p> : null}
        </div>
        <div className="shrink-0 border-t border-border px-5 py-4">
          <Button
            type="button"
            disabled={!canAdd || isBusy || !inStock}
            onClick={() => void submit()}
            className="h-12 w-full rounded-full bg-teal text-xs font-semibold tracking-[0.12em] text-teal-foreground uppercase"
          >
            {canAdd && !inStock ? "Out of Stock" : addToCartLabel(status)}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
