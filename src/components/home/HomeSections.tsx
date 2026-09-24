"use client";

import Link from "next/link";
import { ShoppingBag } from "lucide-react";

import { ProductCard } from "@/components/site/ProductCard";
import { ProductImage } from "@/components/site/ProductImage";
import { Reveal } from "@/components/Reveal";
import { Button } from "@/components/ui/button";
import type { Collection, Product } from "@/lib/catalog-types";

const FAN_FALLBACK = [
  "/images/oversized-lavender.png",
  "/images/regular-white.webp",
  "/images/terry-beige.png",
  "/images/sun-faded-green.png",
  "/images/lava-black.png",
];

export function HomeHero({ products }: { products: Product[] }) {
  const rotations = [-14, -7, 0, 7, 14];
  const fanImages = products.slice(0, 5).map((p) => p.image);
  const images = fanImages.length >= 3 ? fanImages : FAN_FALLBACK;

  return (
    <section className="overflow-x-clip px-5 pb-14 pt-8 sm:px-8 sm:pb-24 sm:pt-14">
      <div className="mx-auto max-w-5xl text-center">
        <div className="animate-fan-in inline-flex items-center gap-2 rounded-full bg-ink px-4 py-1.5 text-[0.65rem] font-semibold tracking-[0.16em] text-ink-foreground uppercase">
          <ShoppingBag className="size-3.5" strokeWidth={2} />
          Premium Tees
        </div>

        <h1 className="animate-fan-in mt-6 font-display text-[clamp(2rem,8.5vw,2.65rem)] leading-[1.05] font-bold tracking-tight uppercase sm:mt-7 sm:text-6xl lg:text-7xl">
          It&apos;s a manifesto
          <br />
          to be worn.
        </h1>

        <p
          className="animate-fan-in mx-auto mt-5 max-w-xl text-sm leading-relaxed text-muted-foreground sm:mt-6 sm:text-base"
          style={{ animationDelay: "120ms" }}
        >
          Heavyweight 240–300 GSM cotton essentials for everyday life. Timeless cuts, honest
          pricing, and premium comfort built to last.
        </p>

        <div
          className="animate-fan-in mt-7 flex w-full flex-col items-stretch justify-center gap-3 sm:mt-8 sm:flex-row sm:items-center"
          style={{ animationDelay: "200ms" }}
        >
          <Button
            asChild
            className="h-12 w-full rounded-full bg-teal px-10 text-sm font-semibold tracking-[0.12em] text-teal-foreground uppercase hover:bg-teal/90 sm:w-auto"
          >
            <Link href="/collection">Shop Collection</Link>
          </Button>
        </div>
      </div>

      <div className="relative mx-auto mt-8 w-full max-w-6xl px-3 sm:mt-12 sm:px-10">
        <div className="flex items-end justify-center gap-2 py-8 sm:gap-5 sm:py-12 md:gap-6">
          {images.map((src, index) => {
            const tilt = rotations[index % rotations.length] ?? 0;
            return (
              <div
                key={`${src}-${index}`}
                className="animate-fan-in w-[19%] max-w-[14rem] min-w-0 origin-bottom"
                style={{ animationDelay: `${260 + index * 80}ms` }}
              >
                <div
                  className="overflow-hidden rounded-xl bg-[#f5f5f5] shadow-[0_14px_32px_rgba(0,0,0,0.12)] transition-transform duration-500 [transform:rotate(calc(var(--tilt)*0.4))] hover:[transform:translateY(-0.5rem)_rotate(calc(var(--tilt)*0.4))] sm:rounded-2xl sm:shadow-[0_18px_40px_rgba(0,0,0,0.12)] sm:[transform:rotate(calc(var(--tilt)*0.75))] sm:hover:[transform:translateY(-0.5rem)_rotate(calc(var(--tilt)*0.75))]"
                  style={{ ["--tilt" as string]: `${tilt}deg` }}
                >
                  <ProductImage
                    src={src}
                    alt="AB Collection premium tee lookbook"
                    width={480}
                    height={720}
                    sizes="(max-width: 640px) 22vw, 224px"
                    priority={index < 3}
                    className="block aspect-[2/3] h-auto w-full scale-[1.06] object-cover object-top"
                  />
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
}

export function HomeDiscover({ collections }: { collections: Collection[] }) {
  return (
    <section className="bg-sand px-5 py-16 sm:px-8 sm:py-28" aria-labelledby="discover-heading">
      <Reveal>
        <h2
          id="discover-heading"
          className="text-center font-display text-[2rem] font-bold tracking-tight sm:text-5xl"
        >
          Discover Collection
        </h2>
      </Reveal>

      <div className="mx-auto mt-10 grid max-w-6xl gap-5 sm:mt-12 sm:grid-cols-2 sm:gap-6 md:grid-cols-3">
        {collections.map((category, index) => {
          const href = category.productId ? `/collection/${category.productId}` : "/collection";
          return (
            <Reveal key={category.id} delay={index * 90}>
              <article className="overflow-hidden rounded-[1.75rem] bg-white p-4 pb-5 shadow-sm">
                <Link href={href} className="block overflow-hidden rounded-[1.25rem] bg-white">
                  <ProductImage
                    src={category.image}
                    alt={`${category.title} tees from AB Collection`}
                    width={640}
                    height={800}
                    sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 33vw"
                    className="aspect-[4/5] w-full object-cover object-top transition-transform duration-700 hover:scale-105"
                  />
                </Link>
                <Button
                  asChild
                  className="mt-4 h-12 w-full rounded-full bg-teal text-sm font-semibold tracking-[0.14em] text-teal-foreground uppercase hover:bg-teal/90"
                >
                  <Link href={href}>{category.title}</Link>
                </Button>
              </article>
            </Reveal>
          );
        })}
      </div>
    </section>
  );
}

export function HomeFeatured({ products }: { products: Product[] }) {
  const featured = products.filter((p) => p.featured).slice(0, 6);
  const list = featured.length ? featured : products.slice(0, 6);

  return (
    <section className="px-5 py-16 sm:px-8 sm:py-28" aria-labelledby="featured-heading">
      <Reveal>
        <h2
          id="featured-heading"
          className="text-center font-display text-[2rem] font-bold tracking-tight sm:text-5xl"
        >
          Featured Collection
        </h2>
      </Reveal>

      <div className="mx-auto mt-10 grid max-w-7xl gap-5 sm:mt-14 sm:grid-cols-2 sm:gap-6 lg:grid-cols-3">
        {list.map((product, index) => (
          <Reveal key={product.id} delay={index * 60}>
            <ProductCard product={product} />
          </Reveal>
        ))}
      </div>

      <div className="mt-10 text-center sm:mt-12">
        <Button
          asChild
          className="h-12 w-full max-w-xs rounded-full bg-teal px-10 text-sm font-semibold tracking-[0.12em] text-teal-foreground uppercase hover:bg-teal/90 sm:w-auto sm:max-w-none"
        >
          <Link href="/collection">See All</Link>
        </Button>
      </div>
    </section>
  );
}

export function HomeCommunity({ products }: { products: Product[] }) {
  const positions = [
    "left-[4%] top-[14%] sm:left-[8%] sm:top-[18%]",
    "left-[12%] top-[62%] sm:left-[18%] sm:top-[58%]",
    "left-[22%] top-[20%] sm:left-[28%] sm:top-[22%]",
    "left-[6%] bottom-[10%] sm:left-[12%] sm:bottom-[12%]",
    "right-[4%] top-[12%] sm:right-[10%] sm:top-[16%]",
    "right-[14%] top-[56%] sm:right-[22%] sm:top-[52%]",
    "right-[4%] bottom-[14%] sm:right-[8%] sm:bottom-[18%]",
    "right-[22%] bottom-[12%] sm:right-[30%] sm:bottom-[14%]",
    "left-[38%] top-[8%] sm:left-[42%] sm:top-[12%]",
    "left-[44%] bottom-[8%] sm:left-[48%] sm:bottom-[10%]",
  ];
  // On small screens keep edge avatars only so the headline stays clear
  const mobileHidden = new Set([2, 8, 9]);
  const communityImages = products.slice(0, 10).map((p) => p.image);

  return (
    <section className="relative overflow-hidden bg-ink px-5 py-24 text-ink-foreground sm:px-8 sm:py-36">
      <div className="pointer-events-none absolute inset-0 opacity-70" aria-hidden>
        <svg className="h-full w-full" viewBox="0 0 100 100" preserveAspectRatio="none">
          <g stroke="white" strokeWidth="0.15" strokeDasharray="0.8 0.8" fill="none" opacity="0.35">
            <line x1="12" y1="25" x2="50" y2="50" />
            <line x1="25" y1="70" x2="50" y2="50" />
            <line x1="40" y1="20" x2="50" y2="50" />
            <line x1="70" y1="22" x2="50" y2="50" />
            <line x1="85" y1="30" x2="50" y2="50" />
            <line x1="80" y1="65" x2="50" y2="50" />
            <line x1="65" y1="82" x2="50" y2="50" />
            <line x1="35" y1="85" x2="50" y2="50" />
          </g>
        </svg>
      </div>

      {communityImages.map((src, index) => (
        <div
          key={`${src}-${index}`}
          className={`animate-float-soft absolute size-12 overflow-hidden rounded-full border-2 border-white/20 shadow-lg sm:size-14 md:size-16 lg:size-20 ${
            mobileHidden.has(index) ? "hidden md:block" : ""
          } ${positions[index]}`}
          style={{ animationDelay: `${index * 0.35}s` }}
        >
          <ProductImage
            src={src}
            alt=""
            width={160}
            height={160}
            sizes="80px"
            className="h-full w-full object-cover object-top"
          />
        </div>
      ))}

      <div className="relative z-10 mx-auto max-w-3xl px-2 text-center sm:px-0">
        <Reveal>
          <h2 className="font-display text-[2rem] font-bold tracking-tight uppercase sm:text-6xl">
            Wear Everyday
          </h2>
          <p className="mx-auto mt-4 max-w-md text-sm text-ink-foreground/65 sm:mt-5 sm:text-base">
            Built for comfort. Designed to be lived in. Join the first wave of AB Collection.
          </p>
          <Button
            asChild
            className="mt-7 h-12 w-full max-w-xs rounded-full bg-teal px-8 text-sm font-semibold tracking-[0.12em] text-teal-foreground uppercase sm:mt-8 sm:w-auto sm:max-w-none"
          >
            <Link href="/about">Our Story</Link>
          </Button>
        </Reveal>
      </div>
    </section>
  );
}
