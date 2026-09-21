"use client";

import { useState } from "react";
import Link from "next/link";
import { ChevronLeft, ChevronRight, Heart } from "lucide-react";

import { useCommerce } from "@/components/commerce/CommerceProvider";
import { useIstefadaOffer } from "@/components/site/IstefadaOfferProvider";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogTitle } from "@/components/ui/dialog";
import type { Product } from "@/lib/catalog-types";
import { getDiscountedPriceLabel } from "@/lib/istefada-offer";
import { colorSwatchClass, colorToImageIndex, indexToColor } from "@/lib/product-colors";
import { cn } from "@/lib/utils";

export function ProductDetail({ product }: { product: Product }) {
  const images = product.images?.length ? product.images : [product.image];
  const [selectedImageIndex, setSelectedImageIndex] = useState(0);
  const [selectedColor, setSelectedColor] = useState(product.colors[0] ?? "");
  const [selectedSize, setSelectedSize] = useState(product.sizes[0] ?? "M");
  const [sizeChartOpen, setSizeChartOpen] = useState(false);
  const { addToCart, buyNow, toggleWishlist, wishlistIds } = useCommerce();
  const { hasOffer } = useIstefadaOffer();
  const wished = wishlistIds.has(product.id);
  const hasSizeChart = Boolean(product.sizeChart?.trim());
  const priced = getDiscountedPriceLabel(product.price);

  const selectColor = (color: string) => {
    setSelectedColor(color);
    setSelectedImageIndex(colorToImageIndex(color, product.colors, images));
  };

  const selectImageIndex = (index: number) => {
    setSelectedImageIndex(index);
    setSelectedColor(indexToColor(index, product.colors, images));
  };

  const go = (dir: number) => {
    const next = (selectedImageIndex + dir + images.length) % images.length;
    selectImageIndex(next);
  };

  const activeImage = images[selectedImageIndex] ?? product.image;
  const selected = { productId: product.id, size: selectedSize, color: selectedColor, quantity: 1 };

  return (
    <div className="mx-auto grid max-w-7xl gap-10 px-5 py-12 lg:grid-cols-2 lg:gap-16 lg:px-8 lg:py-20">
      <div>
        <div className="relative overflow-hidden rounded-3xl bg-muted">
          <img
            key={`${selectedImageIndex}-${activeImage}`}
            src={activeImage}
            alt={`${product.name} — ${selectedColor || product.fabric}`}
            width={1120}
            height={1400}
            className="aspect-[4/5] w-full object-cover object-top transition-opacity duration-300"
          />
          {images.length > 1 ? (
            <>
              <button
                type="button"
                aria-label="Previous image"
                onClick={() => go(-1)}
                className="absolute top-1/2 left-3 flex size-10 -translate-y-1/2 items-center justify-center rounded-full bg-white/90 shadow"
              >
                <ChevronLeft className="size-4" />
              </button>
              <button
                type="button"
                aria-label="Next image"
                onClick={() => go(1)}
                className="absolute top-1/2 right-3 flex size-10 -translate-y-1/2 items-center justify-center rounded-full bg-white/90 shadow"
              >
                <ChevronRight className="size-4" />
              </button>
            </>
          ) : null}
        </div>
        {images.length > 1 ? (
          <div className="mt-4 grid grid-cols-4 gap-3">
            {images.map((src, i) => {
              const thumbColor = indexToColor(i, product.colors, images);
              const selectedThumb = i === selectedImageIndex;
              return (
                <button
                  key={`${src}-${i}`}
                  type="button"
                  aria-label={`${product.name} in ${thumbColor}`}
                  aria-pressed={selectedThumb}
                  onClick={() => selectImageIndex(i)}
                  className={cn(
                    "overflow-hidden rounded-xl transition-opacity outline-none focus-visible:ring-0",
                    selectedThumb
                      ? "opacity-100 ring-2 ring-foreground/20"
                      : "opacity-70 hover:opacity-100",
                  )}
                >
                  <img
                    src={src}
                    alt={`${product.name} ${thumbColor}`}
                    className="aspect-square w-full object-cover object-top"
                  />
                </button>
              );
            })}
          </div>
        ) : null}
      </div>

      <div>
        <nav
          className="flex flex-wrap items-center gap-x-2 gap-y-1 text-xs text-muted-foreground"
          aria-label="Breadcrumb"
        >
          <Link href="/" className="hover:text-foreground">
            Home
          </Link>
          <span aria-hidden>/</span>
          <Link href="/collection" className="hover:text-foreground">
            Collection
          </Link>
          <span aria-hidden>/</span>
          <span className="min-w-0 break-words text-foreground">{product.name}</span>
        </nav>

        <div className="mt-8 flex items-start justify-between gap-4">
          <div>
            <p className="eyebrow">{product.fabric}</p>
            <h1 className="mt-3 font-display text-4xl font-bold tracking-tight sm:text-5xl">
              {product.name}
            </h1>
          </div>
          <button
            type="button"
            aria-label={wished ? "Remove from wishlist" : "Add to wishlist"}
            onClick={() => void toggleWishlist(product.id)}
            className={cn(
              "inline-flex size-11 shrink-0 items-center justify-center rounded-full border transition-colors",
              wished
                ? "border-teal bg-teal text-teal-foreground"
                : "border-border hover:border-foreground",
            )}
          >
            <Heart className={cn("size-4", wished && "fill-current")} />
          </button>
        </div>

        {hasOffer && priced.final > 0 ? (
          <div className="mt-4">
            <p className="text-sm text-muted-foreground line-through">{priced.originalLabel}</p>
            <p className="text-2xl font-semibold text-teal">{priced.finalLabel}</p>
            <p className="mt-1 text-xs text-muted-foreground">
              Istefada ₹{priced.original - priced.final} off applied
            </p>
          </div>
        ) : (
          <p className="mt-4 text-2xl font-semibold text-teal">{product.price}</p>
        )}

        <p className="mt-6 text-base leading-relaxed text-muted-foreground">
          {product.description}
        </p>

        <ul className="mt-8 space-y-3">
          {product.details.map((detail) => (
            <li key={detail} className="flex items-start gap-3 text-sm text-muted-foreground">
              <span className="mt-1.5 size-1.5 shrink-0 rounded-full bg-teal" />
              {detail}
            </li>
          ))}
        </ul>

        <div className="mt-8 space-y-6">
          <div>
            <div className="flex flex-wrap items-center justify-between gap-3">
              <p className="text-xs font-semibold tracking-[0.14em] text-muted-foreground uppercase">
                Colour
              </p>
              {hasSizeChart ? (
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setSizeChartOpen(true)}
                  className="h-9 rounded-full px-4 text-xs font-semibold tracking-[0.12em] uppercase"
                >
                  Size Chart
                </Button>
              ) : null}
            </div>
            <div className="mt-3 flex flex-wrap gap-2">
              {product.colors.map((color) => {
                const selectedSwatch = color === selectedColor;
                return (
                  <button
                    key={color}
                    type="button"
                    aria-pressed={selectedSwatch}
                    onClick={() => selectColor(color)}
                    className={cn(
                      "inline-flex items-center gap-2.5 rounded-full border px-4 py-2 text-sm transition-colors outline-none focus-visible:ring-0",
                      selectedSwatch
                        ? "border-foreground bg-foreground text-background"
                        : "border-border bg-background hover:border-foreground",
                    )}
                  >
                    <span
                      aria-hidden
                      className={cn(
                        "size-4 shrink-0 rounded-full",
                        colorSwatchClass(color),
                        selectedSwatch ? "ring-2 ring-background/80" : "",
                      )}
                    />
                    {color}
                  </button>
                );
              })}
            </div>
          </div>

          <div>
            <p className="text-xs font-semibold tracking-[0.14em] text-muted-foreground uppercase">
              Size
            </p>
            <div className="mt-3 flex flex-wrap gap-2">
              {product.sizes.map((size) => {
                const selectedSizeChip = size === selectedSize;
                return (
                  <button
                    key={size}
                    type="button"
                    aria-pressed={selectedSizeChip}
                    onClick={() => setSelectedSize(size)}
                    className={cn(
                      "inline-flex h-10 min-w-10 items-center justify-center rounded-full border px-3 text-sm transition-colors outline-none focus-visible:ring-0",
                      selectedSizeChip
                        ? "border-foreground bg-foreground text-background"
                        : "border-border hover:border-foreground",
                    )}
                  >
                    {size}
                  </button>
                );
              })}
            </div>
          </div>
        </div>

        <div className="mt-10 grid gap-3 sm:grid-cols-2">
          <Button
            onClick={() => void buyNow(selected)}
            className="h-12 w-full rounded-full bg-teal text-xs font-semibold tracking-[0.14em] text-teal-foreground uppercase hover:bg-teal/90"
          >
            Buy Now
          </Button>
          <Button
            onClick={() => void addToCart(selected)}
            variant="outline"
            className="h-12 w-full rounded-full border-foreground text-xs font-semibold tracking-[0.14em] uppercase"
          >
            Add to Cart
          </Button>
        </div>

        <div className="mt-4">
          <Button
            asChild
            variant="ghost"
            className="h-11 w-full rounded-full text-xs font-semibold tracking-[0.12em] uppercase sm:w-auto"
          >
            <Link href="/collection">Back to Collection</Link>
          </Button>
        </div>
      </div>

      {hasSizeChart ? (
        <Dialog open={sizeChartOpen} onOpenChange={setSizeChartOpen}>
          <DialogContent className="flex max-h-[min(90vh,calc(100dvh-2rem))] w-[calc(100vw-2rem)] max-w-lg flex-col gap-0 overflow-hidden p-0 sm:rounded-2xl">
            <div className="shrink-0 border-b border-border px-5 py-4">
              <DialogTitle className="font-display text-xl">Size Chart</DialogTitle>
              <DialogDescription className="sr-only">
                Size chart for {product.name}
              </DialogDescription>
            </div>
            <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain px-5 py-4">
              <img
                src={product.sizeChart}
                alt={`${product.name} size chart`}
                className="mx-auto w-full max-w-full object-contain"
              />
            </div>
          </DialogContent>
        </Dialog>
      ) : null}
    </div>
  );
}
