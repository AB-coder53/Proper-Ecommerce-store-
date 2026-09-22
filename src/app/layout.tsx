import type { Metadata } from "next";
import { Manrope, Playfair_Display } from "next/font/google";
import type { ReactNode } from "react";

import { AppProviders } from "@/components/site/AppProviders";
import { GoogleAnalytics } from "@/components/site/GoogleAnalytics";
import { canonicalUrl } from "@/lib/canonical-url";
import { getCatalog } from "@/lib/catalog.server";
import { JsonLd, organizationJsonLd, websiteJsonLd } from "@/lib/seo";
import { SITE_NAME, SITE_TAGLINE, SITE_URL } from "@/lib/site";

import "./globals.css";

const manrope = Manrope({
  subsets: ["latin"],
  variable: "--font-manrope",
  display: "swap",
});

const playfair = Playfair_Display({
  subsets: ["latin"],
  weight: ["500", "600", "700"],
  variable: "--font-playfair",
  display: "swap",
});

export const metadata: Metadata = {
  metadataBase: new URL(SITE_URL),
  title: {
    default: `${SITE_NAME} — ${SITE_TAGLINE}`,
    template: `%s · ${SITE_NAME}`,
  },
  description:
    "Premium everyday essentials for men. Heavyweight cotton tees with timeless design and honest pricing. Reserve your 10% launch discount.",
  applicationName: SITE_NAME,
  authors: [{ name: "Abbas Badwahwala" }],
  creator: SITE_NAME,
  publisher: SITE_NAME,
  category: "fashion",
  keywords: [
    "AB Collection",
    "premium cotton t-shirts",
    "240 GSM tee",
    "French terry oversized",
    "men's essentials India",
    "prelaunch discount",
  ],
  icons: {
    icon: [{ url: "/favicon.png", type: "image/png" }],
  },
  openGraph: {
    siteName: SITE_NAME,
    type: "website",
    locale: "en_IN",
  },
  twitter: {
    card: "summary_large_image",
  },
  alternates: {
    canonical: "/",
  },
};

export default async function RootLayout({ children }: { children: ReactNode }) {
  const catalog = await getCatalog();

  return (
    <html lang="en" className={`${manrope.variable} ${playfair.variable}`}>
      <head>
        <link rel="alternate" type="text/plain" href={canonicalUrl("/llms.txt")} title="LLMs.txt" />
        <link rel="alternate" type="text/plain" href={canonicalUrl("/ai.txt")} title="AI.txt" />
      </head>
      <body>
        <GoogleAnalytics />
        <JsonLd data={[organizationJsonLd(), websiteJsonLd()]} />
        <AppProviders catalog={catalog}>{children}</AppProviders>
      </body>
    </html>
  );
}
