"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { ChevronLeft, ChevronRight, Heart, Minus, Plus } from "lucide-react";

import { useCommerce } from "@/components/commerce/CommerceProvider";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
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
import { useInView } from "@/hooks/use-in-view";
import { useProductInventory } from "@/hooks/use-product-inventory";
import type { Product } from "@/lib/catalog-types";
import {
  availableStock,
  productHasPurchasableStock,
  quantityCap,
  stockStatusLabel,
  variantHasStock,
} from "@/lib/inventory";
import { cdnImageUrl } from "@/lib/media";
import { colorToImageIndex, indexToColor, visibleImageIndexes } from "@/lib/product-colors";
import { isValidProductVariant } from "@/lib/product-variants";
import type { ReviewListing } from "@/lib/reviews";
import type { DeliveryEstimate } from "@/lib/shipping";
import type { BundleOfferView } from "@/lib/store-offers";
import { cn } from "@/lib/utils";

function firstPurchasableVariant(product: Product) {
  const colors = product.colors.length ? product.colors : [""];
  const sizes = product.sizes.length ? product.sizes : ["M"];
  for (const color of colors) {
    const size = sizes.find((candidate) => variantHasStock(product, color, candidate));
    if (size) return { color, size };
  }
  return { color: colors[0] ?? "", size: sizes[0] ?? "M" };
}

export function ProductDetail({
  product,
  bundles,
  delivery,
  reviewListing,
}: {
  product: Product;
  bundles: BundleOfferView[];
  delivery: DeliveryEstimate;
  reviewListing?: ReviewListing | undefined;
}) {
  const liveProduct = useProductInventory(product);
  const images = liveProduct.images?.length ? liveProduct.images : [liveProduct.image];
  const visibleIndexes = visibleImageIndexes(images);
  const [initialVariant] = useState(() => firstPurchasableVariant(product));
  const [selectedImageIndex, setSelectedImageIndex] = useState(() =>
    colorToImageIndex(initialVariant.color, product.colors, images, product.colorImages),
  );
  const [selectedColor, setSelectedColor] = useState(initialVariant.color);
  const [selectedSize, setSelectedSize] = useState(initialVariant.size);
  const [quantity, setQuantity] = useState(1);
  const [sizeChartOpen, setSizeChartOpen] = useState(false);
  const purchaseRef = useRef<HTMLDivElement>(null);
  const purchaseInView = useInView(purchaseRef);
  const { buyNow, toggleWishlist, wishlistIds, cartDrawerOpen } = useCommerce();
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
    setSelectedImageIndex(
      colorToImageIndex(color, liveProduct.colors, images, liveProduct.colorImages),
    );
    if (!variantHasStock(liveProduct, color, selectedSize)) {
      const nextSize = liveProduct.sizes.find((size) => variantHasStock(liveProduct, color, size));
      if (nextSize) setSelectedSize(nextSize);
    }
  };

  const selectImageIndex = (index: number) => {
    setSelectedImageIndex(index);
    setSelectedColor(indexToColor(index, liveProduct.colors, images, liveProduct.colorImages));
  };

  const go = (dir: number) => {
    if (!visibleIndexes.length) return;
    const position = visibleIndexes.indexOf(selectedImageIndex);
    const start = position >= 0 ? position : 0;
    const next =
      visibleIndexes[(start + dir + visibleIndexes.length) % visibleIndexes.length] ??
      visibleIndexes[0];
    if (next != null) selectImageIndex(next);
  };

  const activeImage =
    images[selectedImageIndex]?.trim() || images.find((src) => src.trim()) || liveProduct.image;
  const heroPrioritySrc = useRef(activeImage);
  const selected = {
    productId: liveProduct.id,
    size: selectedSize,
    color: selectedColor,
    quantity,
  };
  const showStickyBar = !purchaseInView && !cartDrawerOpen;
  const buyLabel = inStock ? "Buy now" : "Out of stock";
  const cartLabel = inStock ? addToCartLabel(status) : "Out of stock";

  return (
    <div className="mx-auto grid min-w-0 max-w-7xl pb-[calc(8.5rem+env(safe-area-inset-bottom))] lg:grid-cols-2 lg:gap-16 lg:px-8 lg:py-16 lg:pb-20">
      <div className="min-w-0 lg:sticky lg:top-24 lg:self-start">
        <div className="relative overflow-hidden bg-muted lg:rounded-3xl">
          <ProductImage
            key={`${selectedImageIndex}-${activeImage}`}
            src={activeImage}
            alt={`${product.name} — ${selectedColor || product.fabric}`}
            width={1800}
            height={2250}
            sizes="(max-width: 1024px) 100vw, 56vw"
            priority={heroPrioritySrc.current === activeImage}
            className="h-auto w-full object-contain"
          />
          {visibleIndexes.length > 1 ? (
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
        {visibleIndexes.length > 1 ? (
          <div className="mt-3 flex gap-2 overflow-x-auto px-5 pb-1 lg:px-0">
            {visibleIndexes.map((i) => {
              const src = images[i] ?? "";
              const thumbColor = indexToColor(
                i,
                liveProduct.colors,
                images,
                liveProduct.colorImages,
              );
              const selectedThumb = i === selectedImageIndex;
              return (
                <button
                  key={`${src}-${i}`}
                  type="button"
                  aria-label={`${product.name} in ${thumbColor}`}
                  aria-pressed={selectedThumb}
                  onClick={() => selectImageIndex(i)}
                  className={cn(
                    "w-14 shrink-0 overflow-hidden rounded-xl transition-opacity outline-none focus-visible:ring-0 sm:w-20",
                    selectedThumb
                      ? "opacity-100 ring-2 ring-foreground/20"
                      : "opacity-70 hover:opacity-100",
                  )}
                >
                  <ProductImage
                    src={src}
                    alt={`${product.name} ${thumbColor}`}
                    width={480}
                    height={480}
                    sizes="(max-width: 1024px) 22vw, 160px"
                    className="aspect-square w-full object-cover object-top"
                  />
                </button>
              );
            })}
          </div>
        ) : null}
      </div>

      <div className="px-5 pt-5 lg:px-0 lg:pt-0">
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

        <div className="mt-4 flex items-start justify-between gap-4">
          <div>
            <p className="eyebrow">{product.fabric}</p>
            <h1 className="mt-2 font-display text-[1.65rem] leading-none font-bold tracking-tight sm:text-5xl">
              {product.name}
            </h1>
            <ProductBadgeList product={liveProduct} className="mt-3" />
            {reviewListing && reviewListing.summary.count > 0 ? (
              <a
                href="#reviews"
                className="mt-3 inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground"
              >
                <StarRating value={Math.round(reviewListing.summary.average)} size="sm" />
                <span>
                  {reviewListing.summary.average.toFixed(1)} · {reviewListing.summary.count} review
                  {reviewListing.summary.count === 1 ? "" : "s"}
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

        <div className="mt-6 space-y-6">
          <div className="flex items-center justify-between gap-3">
            <p className="text-xs font-semibold tracking-[0.14em] text-muted-foreground uppercase">
              Choose colour and size
            </p>
            {hasSizeChart ? (
              <button
                type="button"
                onClick={() => setSizeChartOpen(true)}
                className="text-sm font-medium underline underline-offset-4"
              >
                Size chart
              </button>
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

        <div className="mt-5 flex flex-wrap items-center gap-3">
          <div
            className="inline-flex items-center gap-1 rounded-full border border-border px-1 py-1"
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
          {variantReady ? (
            <p
              className={cn(
                "text-sm font-medium",
                stock <= 0
                  ? "text-destructive"
                  : stock <= 5
                    ? "text-amber-700"
                    : "text-muted-foreground",
              )}
            >
              {stockStatusLabel(stock)}
            </p>
          ) : null}
        </div>

        <div ref={purchaseRef} className="mt-5 grid gap-3">
          <Button
            onClick={() => void buyNow(selected)}
            disabled={!canPurchase}
            className="h-14 w-full rounded-full bg-teal text-sm font-semibold tracking-[0.08em] text-teal-foreground uppercase shadow-sm hover:bg-teal/90"
          >
            {buyLabel}
          </Button>
          <Button
            type="button"
            disabled={isBusy || !canPurchase}
            onClick={() => void run(selected)}
            variant="outline"
            className="h-12 w-full rounded-full border-foreground text-sm font-semibold"
          >
            {cartLabel}
          </Button>
        </div>

        <ProductDeliveryEstimate estimate={delivery} />
        {error ? <p className="mt-3 text-sm text-destructive">{error}</p> : null}

        <p className="mt-6 text-sm leading-relaxed text-muted-foreground">{product.description}</p>

        {product.details.length ? (
          <Accordion type="single" collapsible className="mt-4 border-t">
            <AccordionItem value="details">
              <AccordionTrigger>Fabric and details</AccordionTrigger>
              <AccordionContent>
                <ul className="space-y-3">
                  {product.details.map((detail) => (
                    <li
                      key={detail}
                      className="flex items-start gap-3 text-sm text-muted-foreground"
                    >
                      <span className="mt-1.5 size-1.5 shrink-0 rounded-full bg-teal" />
                      {detail}
                    </li>
                  ))}
                </ul>
              </AccordionContent>
            </AccordionItem>
          </Accordion>
        ) : null}

        <ProductBundleOffers bundles={bundles} />

        <ProductReviews
          productId={product.id}
          {...(reviewListing ? { initialListing: reviewListing } : {})}
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
                src={cdnImageUrl(product.sizeChart)}
                alt={`${product.name} size chart`}
                className="mx-auto w-full max-w-full object-contain"
              />
            </div>
          </DialogContent>
        </Dialog>
      ) : null}

      <div
        className={cn(
          "fixed inset-x-0 bottom-0 z-40 border-t border-border bg-background/95 px-4 pt-3 shadow-[0_-8px_24px_rgba(0,0,0,0.08)] backdrop-blur-md transition-transform duration-200 pb-[max(0.75rem,env(safe-area-inset-bottom))]",
          showStickyBar ? "translate-y-0" : "pointer-events-none translate-y-full",
        )}
        aria-hidden={!showStickyBar}
      >
        <div className="mx-auto flex max-w-7xl items-center gap-2">
          <div className="min-w-0 flex-1">
            <p className="truncate text-xs font-medium">
              {selectedColor}
              {selectedSize ? ` · ${selectedSize}` : ""}
              {variantReady ? ` · ${stockStatusLabel(stock)}` : ""}
            </p>
            <div className="hidden sm:block">
              <CatalogPrice product={liveProduct} hasOffer={hasOffer} size="card" align="left" />
            </div>
          </div>
          <Button
            type="button"
            disabled={isBusy || !canPurchase}
            onClick={() => void run(selected)}
            variant="outline"
            className="h-11 w-[4.75rem] shrink-0 rounded-full border-foreground px-0 text-xs font-semibold sm:h-12 sm:w-auto sm:px-5 sm:text-sm"
          >
            <span className="sm:hidden">Add</span>
            <span className="hidden sm:inline">{cartLabel}</span>
          </Button>
          <Button
            onClick={() => void buyNow(selected)}
            disabled={!canPurchase}
            className="h-11 w-[6.75rem] shrink-0 rounded-full bg-teal px-0 text-xs font-semibold tracking-[0.04em] text-teal-foreground uppercase hover:bg-teal/90 sm:h-12 sm:w-auto sm:px-6 sm:text-sm"
          >
            {buyLabel}
          </Button>
        </div>
      </div>
    </div>
  );
}
