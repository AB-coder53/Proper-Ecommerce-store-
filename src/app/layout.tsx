import type { Metadata } from "next";
import type { ReactNode } from "react";

import { AppProviders } from "@/components/site/AppProviders";
import { getCatalog } from "@/lib/catalog.server";
import { JsonLd, organizationJsonLd, websiteJsonLd } from "@/lib/seo";
import { SITE_NAME, SITE_TAGLINE, SITE_URL } from "@/lib/site";

import "./globals.css";

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
    <html lang="en">
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link
          href="https://fonts.googleapis.com/css2?family=Manrope:wght@400;500;600;700&family=Playfair+Display:wght@500;600;700&display=swap"
          rel="stylesheet"
        />
      </head>
      <body>
        <JsonLd data={[organizationJsonLd(), websiteJsonLd()]} />
        <AppProviders catalog={catalog}>{children}</AppProviders>
      </body>
    </html>
  );
}
