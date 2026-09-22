"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { ChevronLeft, ChevronRight, Heart, Minus, Plus } from "lucide-react";

import { useCommerce } from "@/components/commerce/CommerceProvider";
import { CatalogPrice } from "@/components/site/CatalogPrice";
import { ProductBadgeList } from "@/components/site/ProductBadgeList";
import { ProductBundleOffers } from "@/components/site/ProductBundleOffers";
import { ProductDeliveryEstimate } from "@/components/site/ProductDeliveryEstimate";
import { ProductImage } from "@/components/site/ProductImage";
import { ProductReviews } from "@/components/site/ProductReviews";
import { ProductVariantPicker } from "@/components/site/ProductVariantPicker";
import { StarRating } from "@/components/site/StarRating";
import { useIstefadaOffer } from "@/components/site/IstefadaOfferProvider";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogTitle } from "@/components/ui/dialog";
import { addToCartLabel, useAddToCart } from "@/hooks/use-add-to-cart";
import { useProductInventory } from "@/hooks/use-product-inventory";
import type { Product } from "@/lib/catalog-types";
import {
  availableStock,
  productHasPurchasableStock,
  quantityCap,
  variantHasStock,
} from "@/lib/inventory";
import { colorToImageIndex, indexToColor } from "@/lib/product-colors";
import { isValidProductVariant } from "@/lib/product-variants";
import type { ReviewSummary } from "@/lib/reviews";
import type { DeliveryEstimate } from "@/lib/shipping";
import type { BundleOfferView } from "@/lib/store-offers";
import { cn } from "@/lib/utils";

export function ProductDetail({
  product,
  bundles,
  delivery,
  reviewSummary,
}: {
  product: Product;
  bundles: BundleOfferView[];
  delivery: DeliveryEstimate;
  reviewSummary?: ReviewSummary | undefined;
}) {
  const liveProduct = useProductInventory(product);
  const images = liveProduct.images?.length ? liveProduct.images : [liveProduct.image];
  const [selectedImageIndex, setSelectedImageIndex] = useState(0);
  const [selectedColor, setSelectedColor] = useState(product.colors[0] ?? "");
  const [selectedSize, setSelectedSize] = useState(product.sizes[0] ?? "M");
  const [quantity, setQuantity] = useState(1);
  const [sizeChartOpen, setSizeChartOpen] = useState(false);
  const { buyNow, toggleWishlist, wishlistIds } = useCommerce();
  const { status, error, run, isBusy } = useAddToCart();
  const { hasOffer } = useIstefadaOffer();
  const wished = wishlistIds.has(product.id);
  const hasSizeChart = Boolean(liveProduct.sizeChart?.trim());
  const stock = availableStock(liveProduct, selectedColor, selectedSize);
  const productSoldOut = !productHasPurchasableStock(liveProduct);
  const inStock = stock > 0;
  const maxQty = Math.max(1, quantityCap(stock) || 1);
  const variantReady = isValidProductVariant(liveProduct, selectedColor, selectedSize);
  const canPurchase = variantReady && inStock;

  useEffect(() => {
    setQuantity((current) => Math.min(current, maxQty));
  }, [maxQty]);

  const selectColor = (color: string) => {
    setSelectedColor(color);
    setSelectedImageIndex(colorToImageIndex(color, liveProduct.colors, images));
    if (!variantHasStock(liveProduct, color, selectedSize)) {
      const nextSize = liveProduct.sizes.find((size) => variantHasStock(liveProduct, color, size));
      if (nextSize) setSelectedSize(nextSize);
    }
  };

  const selectImageIndex = (index: number) => {
    setSelectedImageIndex(index);
    setSelectedColor(indexToColor(index, liveProduct.colors, images));
  };

  const go = (dir: number) => {
    const next = (selectedImageIndex + dir + images.length) % images.length;
    selectImageIndex(next);
  };

  const activeImage = images[selectedImageIndex] ?? liveProduct.image;
  const selected = {
    productId: liveProduct.id,
    size: selectedSize,
    color: selectedColor,
    quantity,
  };

  return (
    <div className="mx-auto grid min-w-0 max-w-7xl gap-10 px-5 py-12 lg:grid-cols-2 lg:gap-16 lg:px-8 lg:py-20">
      <div className="min-w-0">
        <div className="relative overflow-hidden rounded-3xl bg-muted">
          <ProductImage
            key={`${selectedImageIndex}-${activeImage}`}
            src={activeImage}
            alt={`${product.name} — ${selectedColor || product.fabric}`}
            width={1120}
            height={1400}
            sizes="(max-width: 1024px) 100vw, 50vw"
            priority
            className="aspect-[4/5] w-full object-cover object-top transition-opacity duration-300"
          />
          {images.length > 1 ? (
            <>
              <button
                type="button"
                aria-label="Previous image"
                onClick={() => go(-1)}
                className="absolute top-1/2 left-3 flex size-11 -translate-y-1/2 items-center justify-center rounded-full bg-white/90 shadow"
              >
                <ChevronLeft className="size-4" />
              </button>
              <button
                type="button"
                aria-label="Next image"
                onClick={() => go(1)}
                className="absolute top-1/2 right-3 flex size-11 -translate-y-1/2 items-center justify-center rounded-full bg-white/90 shadow"
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
                  <ProductImage
                    src={src}
                    alt={`${product.name} ${thumbColor}`}
                    width={240}
                    height={240}
                    sizes="25vw"
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
            <h1 className="mt-3 font-display text-[clamp(1.75rem,8vw,3rem)] font-bold tracking-tight sm:text-5xl">
              {product.name}
            </h1>
            <ProductBadgeList product={liveProduct} className="mt-3" />
            {reviewSummary && reviewSummary.count > 0 ? (
              <a
                href="#reviews"
                className="mt-3 inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground"
              >
                <StarRating value={Math.round(reviewSummary.average)} size="sm" />
                <span>
                  {reviewSummary.average.toFixed(1)} · {reviewSummary.count} review
                  {reviewSummary.count === 1 ? "" : "s"}
                </span>
              </a>
            ) : null}
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

        <div className="mt-4">
          <CatalogPrice product={liveProduct} hasOffer={hasOffer} align="left" size="detail" />
          {productSoldOut ? (
            <p className="mt-2 text-sm text-muted-foreground">
              This product is currently sold out.
            </p>
          ) : null}
        </div>

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
          <div className="flex flex-wrap items-center justify-between gap-3">
            <p className="text-xs font-semibold tracking-[0.14em] text-muted-foreground uppercase">
              Options
            </p>
            {hasSizeChart ? (
              <Button
                type="button"
                variant="outline"
                onClick={() => setSizeChartOpen(true)}
                className="h-11 rounded-full px-4 text-xs font-semibold tracking-[0.12em] uppercase"
              >
                Size Chart
              </Button>
            ) : null}
          </div>
          <ProductVariantPicker
            product={liveProduct}
            selectedColor={selectedColor}
            selectedSize={selectedSize}
            onColorChange={selectColor}
            onSizeChange={setSelectedSize}
          />
        </div>

        <div className="mt-6">
          <p className="text-xs font-semibold tracking-[0.14em] text-muted-foreground uppercase">
            Quantity
          </p>
          <div
            className="mt-3 inline-flex items-center gap-1 rounded-full border border-border px-1 py-1"
            aria-label="Quantity"
          >
            <button
              type="button"
              aria-label="Decrease quantity"
              disabled={!inStock || quantity <= 1}
              onClick={() => setQuantity((current) => Math.max(1, current - 1))}
              className="inline-flex size-11 items-center justify-center rounded-full hover:bg-muted disabled:opacity-40"
            >
              <Minus className="size-3.5" />
            </button>
            <span className="min-w-8 text-center text-sm font-medium" aria-live="polite">
              {quantity}
            </span>
            <button
              type="button"
              aria-label="Increase quantity"
              disabled={!inStock || quantity >= maxQty}
              onClick={() => setQuantity((current) => Math.min(maxQty, current + 1))}
              className="inline-flex size-11 items-center justify-center rounded-full hover:bg-muted disabled:opacity-40"
            >
              <Plus className="size-3.5" />
            </button>
          </div>
        </div>

        <ProductDeliveryEstimate estimate={delivery} />

        <div className="mt-10 grid gap-3 sm:grid-cols-2">
          <Button
            onClick={() => void buyNow(selected)}
            disabled={!canPurchase}
            className="h-12 w-full rounded-full bg-teal text-xs font-semibold tracking-[0.14em] text-teal-foreground uppercase hover:bg-teal/90"
          >
            {inStock ? "Buy Now" : "Out of Stock"}
          </Button>
          <Button
            type="button"
            disabled={isBusy || !canPurchase}
            onClick={() => void run(selected)}
            variant="outline"
            className="h-12 w-full rounded-full border-foreground text-xs font-semibold tracking-[0.14em] uppercase"
          >
            {inStock ? addToCartLabel(status) : "Out of Stock"}
          </Button>
        </div>
        {!inStock && variantReady ? (
          <p className="mt-3 text-sm text-destructive">
            This product/variant is currently out of stock.
          </p>
        ) : null}
        {error ? <p className="mt-3 text-sm text-destructive">{error}</p> : null}

        <ProductBundleOffers bundles={bundles} />

        <ProductReviews
          productId={product.id}
          {...(reviewSummary ? { initialSummary: reviewSummary } : {})}
        />

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
          <DialogContent className="flex max-h-[min(90vh,calc(100dvh-2rem))] w-[min(100%,calc(100vw-1.5rem))] max-w-lg flex-col gap-0 overflow-hidden p-0 sm:rounded-2xl">
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
