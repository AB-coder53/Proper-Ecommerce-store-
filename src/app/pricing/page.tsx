import { LegalPage } from "@/components/legal/LegalPage";
import { PRICING_DOCUMENT } from "@/lib/legal/content";
import { JsonLd, breadcrumbJsonLd, buildPageMetadata } from "@/lib/seo";

export const metadata = buildPageMetadata({
  title: "Pricing & Tax Information",
  description: PRICING_DOCUMENT.description,
  path: "/pricing",
});

export default function PricingPage() {
  return (
    <>
      <JsonLd
        data={breadcrumbJsonLd([
          { name: "Home", path: "/" },
          { name: "Pricing & Tax", path: "/pricing" },
        ])}
      />
      <LegalPage document={PRICING_DOCUMENT} />
    </>
  );
}
