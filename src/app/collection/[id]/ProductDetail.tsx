"use client";

import { useState } from "react";
import Link from "next/link";
import { ChevronLeft, ChevronRight, Heart } from "lucide-react";

import { useCommerce } from "@/components/commerce/CommerceProvider";
import { Button } from "@/components/ui/button";
import type { Product } from "@/lib/catalog-types";
import { cn } from "@/lib/utils";

export function ProductDetail({ product }: { product: Product }) {
  const images = product.images ?? [product.image];
  const [index, setIndex] = useState(0);
  const [size, setSize] = useState(product.sizes[0] ?? "M");
  const [color, setColor] = useState(product.colors[0] ?? "");
  const { addToCart, buyNow, toggleWishlist, wishlistIds } = useCommerce();
  const wished = wishlistIds.has(product.id);
  const go = (dir: number) => setIndex((i) => (i + dir + images.length) % images.length);

  const selected = { productId: product.id, size, color, quantity: 1 };

  return (
    <div className="mx-auto grid max-w-7xl gap-10 px-5 py-12 lg:grid-cols-2 lg:gap-16 lg:px-8 lg:py-20">
      <div>
        <div className="relative overflow-hidden rounded-3xl bg-muted">
          <img
            src={images[index]}
            alt={`${product.name} — ${product.colors[index] ?? product.fabric}`}
            width={1120}
            height={1400}
            className="aspect-[4/5] w-full object-cover object-top"
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
            {images.map((src, i) => (
              <button
                key={src}
                type="button"
                onClick={() => setIndex(i)}
                className={`overflow-hidden rounded-xl border ${
                  i === index ? "border-foreground" : "border-transparent"
                }`}
              >
                <img
                  src={src}
                  alt={`${product.name} colour ${product.colors[i] ?? i + 1}`}
                  className="aspect-square w-full object-cover object-top"
                />
              </button>
            ))}
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

        <p className="mt-4 text-2xl font-semibold text-teal">{product.price}</p>
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

        <div className="mt-8 space-y-5">
          <div>
            <p className="text-xs font-semibold tracking-[0.14em] text-muted-foreground uppercase">
              Colour
            </p>
            <div className="mt-3 flex flex-wrap gap-2">
              {product.colors.map((c) => (
                <button
                  key={c}
                  type="button"
                  onClick={() => setColor(c)}
                  className={cn(
                    "rounded-full border px-4 py-2 text-sm transition-colors",
                    color === c
                      ? "border-foreground bg-foreground text-background"
                      : "border-border hover:border-foreground",
                  )}
                >
                  {c}
                </button>
              ))}
            </div>
          </div>
          <div>
            <p className="text-xs font-semibold tracking-[0.14em] text-muted-foreground uppercase">
              Size
            </p>
            <div className="mt-3 flex flex-wrap gap-2">
              {product.sizes.map((s) => (
                <button
                  key={s}
                  type="button"
                  onClick={() => setSize(s)}
                  className={cn(
                    "inline-flex size-11 items-center justify-center rounded-full border text-sm transition-colors",
                    size === s
                      ? "border-foreground bg-foreground text-background"
                      : "border-border hover:border-foreground",
                  )}
                >
                  {s}
                </button>
              ))}
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
    </div>
  );
}
