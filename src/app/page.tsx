import {
  HomeCommunity,
  HomeDiscover,
  HomeFeatured,
  HomeHero,
} from "@/components/home/HomeSections";
import { getCatalog } from "@/lib/catalog.server";
import { JsonLd, breadcrumbJsonLd, buildPageMetadata } from "@/lib/seo";

export const dynamic = "force-dynamic";

export const metadata = buildPageMetadata({
  title: "Premium Everyday Essentials, Launching Soon",
  description:
    "Register your interest in AB Collection's first drop of 240–300 GSM premium cotton tees and reserve an exclusive 10% launch discount. No payment today.",
  path: "/",
  image: "/images/hero-beige.png",
});

export default async function HomePage() {
  const catalog = await getCatalog();

  return (
    <>
      <JsonLd data={breadcrumbJsonLd([{ name: "Home", path: "/" }])} />
      <HomeHero products={catalog.products} />
      <HomeDiscover collections={catalog.collections} />
      <HomeFeatured products={catalog.products} />
      <HomeCommunity products={catalog.products} />
    </>
  );
}
