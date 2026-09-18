import type { Metadata } from "next";

import type { Product } from "@/lib/catalog-types";
import { SITE_LOCALE, SITE_NAME, SITE_TAGLINE, SITE_URL } from "@/lib/site";

type PageSeoInput = {
  title: string;
  description: string;
  path?: string;
  image?: string;
  type?: "website" | "article";
  noIndex?: boolean;
};

export function absoluteUrl(path = "/") {
  if (path.startsWith("http")) return path;
  return `${SITE_URL}${path.startsWith("/") ? path : `/${path}`}`;
}

export function parsePriceInr(price: string): number | null {
  const digits = price.replace(/[^\d]/g, "");
  if (!digits) return null;
  return Number(digits);
}

export function buildPageMetadata({
  title,
  description,
  path = "/",
  image = "/images/hero-beige.png",
  type = "website",
  noIndex = false,
}: PageSeoInput): Metadata {
  const url = absoluteUrl(path);
  const imageUrl = absoluteUrl(image);
  const fullTitle = title.includes(SITE_NAME) ? title : `${title} · ${SITE_NAME}`;

  return {
    title,
    description,
    alternates: { canonical: url },
    robots: noIndex
      ? { index: false, follow: false }
      : { index: true, follow: true, googleBot: { index: true, follow: true } },
    openGraph: {
      title: fullTitle,
      description,
      url,
      siteName: SITE_NAME,
      locale: SITE_LOCALE,
      type,
      images: [{ url: imageUrl, width: 1200, height: 1600, alt: title }],
    },
    twitter: {
      card: "summary_large_image",
      title: fullTitle,
      description,
      images: [imageUrl],
    },
  };
}

export function organizationJsonLd() {
  return {
    "@context": "https://schema.org",
    "@type": "Organization",
    name: SITE_NAME,
    url: SITE_URL,
    description: `${SITE_NAME} — ${SITE_TAGLINE}. Premium everyday essentials for men.`,
    email: "abbasbadwahwala53@gmail.com",
    sameAs: ["https://instagram.com/abcollection.co.in"],
    logo: absoluteUrl("/favicon.png"),
    brand: {
      "@type": "Brand",
      name: SITE_NAME,
    },
  };
}

export function websiteJsonLd() {
  return {
    "@context": "https://schema.org",
    "@type": "WebSite",
    name: SITE_NAME,
    url: SITE_URL,
    description: `${SITE_TAGLINE}. Heavyweight cotton tees launching soon.`,
    publisher: { "@type": "Organization", name: SITE_NAME },
    potentialAction: {
      "@type": "SearchAction",
      target: `${SITE_URL}/collection?q={search_term_string}`,
      "query-input": "required name=search_term_string",
    },
  };
}

export function breadcrumbJsonLd(items: { name: string; path: string }[]) {
  return {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: items.map((item, index) => ({
      "@type": "ListItem",
      position: index + 1,
      name: item.name,
      item: absoluteUrl(item.path),
    })),
  };
}

export function productJsonLd(product: Product) {
  const price = parsePriceInr(product.price);
  return {
    "@context": "https://schema.org",
    "@type": "Product",
    name: product.name,
    description: product.description,
    image: (product.images ?? [product.image]).map((src) => absoluteUrl(src)),
    brand: { "@type": "Brand", name: SITE_NAME },
    category: "Men's T-Shirts",
    material: product.fabric,
    color: product.colors.join(", "),
    size: product.sizes.join(", "),
    offers: {
      "@type": "Offer",
      url: absoluteUrl(`/collection/${product.id}`),
      priceCurrency: "INR",
      price: price ?? undefined,
      availability: "https://schema.org/PreOrder",
      itemCondition: "https://schema.org/NewCondition",
    },
  };
}

export function faqJsonLd(faqs: readonly { question: string; answer: string }[]) {
  return {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    mainEntity: faqs.map((faq) => ({
      "@type": "Question",
      name: faq.question,
      acceptedAnswer: {
        "@type": "Answer",
        text: faq.answer,
      },
    })),
  };
}

export function JsonLd({ data }: { data: Record<string, unknown> | Record<string, unknown>[] }) {
  return (
    <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(data) }} />
  );
}
