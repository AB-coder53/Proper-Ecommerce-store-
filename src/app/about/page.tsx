import Link from "next/link";
import { Quote } from "lucide-react";

import { Reveal } from "@/components/Reveal";
import { JsonLd, breadcrumbJsonLd, buildPageMetadata } from "@/lib/seo";

export const metadata = buildPageMetadata({
  title: "About",
  description:
    "AB Collection is a premium everyday essentials brand for men — heavyweight cotton, honest pricing, and timeless design. Founded by Abbas Badwahwala.",
  path: "/about",
  image: "/images/fabric.jpg",
});

export default function AboutPage() {
  return (
    <>
      <JsonLd
        data={breadcrumbJsonLd([
          { name: "Home", path: "/" },
          { name: "About", path: "/about" },
        ])}
      />

      <section className="px-5 pt-14 pb-10 sm:px-8 sm:pt-20">
        <div className="mx-auto max-w-4xl text-center">
          <p className="eyebrow">Our story</p>
          <h1 className="mt-4 font-display text-[2.15rem] font-bold tracking-tight sm:text-6xl">
            Built for the in-between
          </h1>
          <p className="mx-auto mt-6 max-w-2xl text-sm leading-relaxed text-muted-foreground sm:text-base">
            Most everyday clothing asks you to compromise. Either it feels good and falls apart, or
            it lasts and never feels like yours. AB Collection is premium construction without
            luxury pricing.
          </p>
        </div>
      </section>

      <section className="px-5 py-10 sm:px-8">
        <div className="mx-auto grid max-w-6xl gap-10 lg:grid-cols-2 lg:items-center">
          <img
            src="/images/fabric.jpg"
            alt="Close-up of heavyweight AB Collection cotton fabric"
            width={1408}
            height={1008}
            className="aspect-[4/3] w-full rounded-3xl object-cover"
          />
          <div>
            <h2 className="font-display text-3xl font-bold tracking-tight sm:text-4xl">
              Comfort first. Always.
            </h2>
            <p className="mt-5 text-sm leading-relaxed text-muted-foreground sm:text-base">
              We spent months on fabric weight, shrinkage and neck ribbing so you never have to
              think about any of it. Buy fewer things. Wear them for years. Every piece is made in
              India with partner units we visit ourselves.
            </p>
            <ul className="mt-8 grid gap-4 sm:grid-cols-2">
              {[
                ["Comfort first", "How it feels on the third wash."],
                ["Timeless design", "Cuts that outlive trends."],
                ["Honest pricing", "Direct to you. No retail markup."],
                ["Made in India", "Quality you can trust."],
              ].map(([title, body]) => (
                <li key={title} className="rounded-2xl border border-border p-4">
                  <p className="font-semibold">{title}</p>
                  <p className="mt-1 text-sm text-muted-foreground">{body}</p>
                </li>
              ))}
            </ul>
          </div>
        </div>
      </section>

      <section className="px-5 py-16 sm:px-8 sm:py-24">
        <Reveal>
          <blockquote className="relative mx-auto max-w-4xl rounded-3xl border border-border px-5 py-12 text-center sm:px-16 sm:py-14">
            <Quote className="mx-auto size-10 text-teal" strokeWidth={1.25} />
            <p className="mt-8 font-display text-2xl leading-snug font-medium sm:text-3xl">
              &ldquo;I kept buying tees that looked right in a photo and felt wrong by the third
              wash. So we built the one I wanted to wear.&rdquo;
            </p>
            <footer className="mt-8 text-sm font-semibold tracking-[0.12em] text-muted-foreground uppercase">
              Abbas Badwahwala · Founder
            </footer>
          </blockquote>
        </Reveal>
        <div className="mt-10 text-center">
          <Link
            href="/collection"
            className="inline-flex h-12 items-center justify-center rounded-full bg-teal px-8 text-xs font-semibold tracking-[0.12em] text-teal-foreground uppercase"
          >
            Explore the Collection
          </Link>
        </div>
      </section>
    </>
  );
}
