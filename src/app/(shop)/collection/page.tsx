import Link from "next/link";

import { ProductCard } from "@/components/site/ProductCard";
import { Reveal } from "@/components/Reveal";
import { getProducts } from "@/lib/catalog.server";
import { catalogImageUrl } from "@/lib/media";
import { JsonLd, breadcrumbJsonLd, buildPageMetadata } from "@/lib/seo";

export const revalidate = 60;

export const metadata = buildPageMetadata({
  title: "Collection",
  description:
    "Browse AB Collection's first drop: oversized tees, regular fit, French terry, sun-faded and acid-wash styles in heavyweight cotton.",
  path: "/collection",
  image: catalogImageUrl("oversized-lavender.png"),
});

export default async function CollectionPage() {
  const products = await getProducts();

  return (
    <>
      <JsonLd
        data={breadcrumbJsonLd([
          { name: "Home", path: "/" },
          { name: "Collection", path: "/collection" },
        ])}
      />

      <section className="px-5 pt-14 pb-8 sm:px-8">
        <div className="mx-auto max-w-7xl text-center">
          <p className="eyebrow">First drop</p>
          <h1 className="mt-4 font-display text-[2.15rem] font-bold tracking-tight sm:text-6xl">
            The Collection
          </h1>
          <p className="mx-auto mt-5 max-w-2xl text-sm leading-relaxed text-muted-foreground sm:text-base">
            Six pieces. Nothing extra. Heavyweight cotton essentials made for Indian weather and
            everyday life. Choose your size and colour, then add to cart.
          </p>
        </div>
      </section>

      <section className="px-5 pb-20 sm:px-8 sm:pb-28">
        <div className="mx-auto grid max-w-7xl gap-5 sm:grid-cols-2 sm:gap-6 lg:grid-cols-3">
          {products.map((product, index) => (
            <Reveal key={product.id} delay={index * 50}>
              <ProductCard product={product} />
            </Reveal>
          ))}
        </div>
        <p className="mx-auto mt-12 max-w-xl text-center text-sm text-muted-foreground">
          Looking for something specific?{" "}
          <Link
            href="/contact"
            className="font-medium text-teal underline-offset-4 hover:underline"
          >
            Contact us
          </Link>{" "}
          or read our{" "}
          <Link href="/faq" className="font-medium text-teal underline-offset-4 hover:underline">
            FAQ
          </Link>
          .
        </p>
      </section>
    </>
  );
}
