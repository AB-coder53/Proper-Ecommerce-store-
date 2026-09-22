"use client";

import type { Product } from "@/lib/catalog-types";
import { availableStock, stockStatusLabel, variantHasStock } from "@/lib/inventory";
import { colorSwatchClass } from "@/lib/product-colors";
import { productVariantOptions } from "@/lib/product-variants";
import { cn } from "@/lib/utils";

export function ProductVariantPicker({
  product,
  selectedColor,
  selectedSize,
  onColorChange,
  onSizeChange,
}: {
  product: Product;
  selectedColor: string;
  selectedSize: string;
  onColorChange: (color: string) => void;
  onSizeChange: (size: string) => void;
}) {
  const options = productVariantOptions(product);
  const selectedStock = availableStock(product, selectedColor, selectedSize);
  const showStock = Boolean(product.variants?.length && selectedColor && selectedSize);

  return (
    <div className="space-y-6">
      {options.requiresColor ? (
        <div>
          <p className="text-xs font-semibold tracking-[0.14em] text-muted-foreground uppercase">
            Colour
          </p>
          <div className="mt-3 flex flex-wrap gap-2">
            {options.colors.map((color) => {
              const selected = color === selectedColor;
              const colorHasStock = options.sizes.some((size) =>
                variantHasStock(product, color, size),
              );
              return (
                <button
                  key={color}
                  type="button"
                  aria-pressed={selected}
                  onClick={() => onColorChange(color)}
                  className={cn(
                    "inline-flex min-h-11 items-center gap-2.5 rounded-full border px-4 py-2 text-sm transition-colors outline-none focus-visible:ring-0",
                    selected
                      ? "border-foreground bg-foreground text-background"
                      : "border-border bg-background hover:border-foreground",
                    !colorHasStock ? "opacity-60" : "",
                  )}
                >
                  <span
                    aria-hidden
                    className={cn(
                      "size-4 shrink-0 rounded-full",
                      colorSwatchClass(color),
                      selected ? "ring-2 ring-background/80" : "",
                    )}
                  />
                  {color}
                </button>
              );
            })}
          </div>
        </div>
      ) : null}

      {options.requiresSize ? (
        <div>
          <p className="text-xs font-semibold tracking-[0.14em] text-muted-foreground uppercase">
            Size
          </p>
          <div className="mt-3 flex flex-wrap gap-2">
            {options.sizes.map((size) => {
              const selected = size === selectedSize;
              const inStock = !selectedColor || variantHasStock(product, selectedColor, size);
              return (
                <button
                  key={size}
                  type="button"
                  aria-pressed={selected}
                  disabled={!inStock}
                  onClick={() => onSizeChange(size)}
                  className={cn(
                    "inline-flex h-11 min-w-11 items-center justify-center rounded-full border px-3 text-sm transition-colors outline-none focus-visible:ring-0",
                    selected
                      ? "border-foreground bg-foreground text-background"
                      : "border-border hover:border-foreground",
                    !inStock ? "cursor-not-allowed opacity-40 hover:border-border" : "",
                  )}
                >
                  {size}
                </button>
              );
            })}
          </div>
        </div>
      ) : null}

      {showStock ? (
        <p
          className={cn(
            "text-sm",
            selectedStock <= 0 ? "text-destructive" : "text-muted-foreground",
          )}
          aria-live="polite"
        >
          {selectedColor} / {selectedSize}
          <span className="ml-2 font-medium">{stockStatusLabel(selectedStock)}</span>
        </p>
      ) : null}
    </div>
  );
}
