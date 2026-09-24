import { LegalPage } from "@/components/legal/LegalPage";
import { SHIPPING_DOCUMENT } from "@/lib/legal/content";
import { JsonLd, breadcrumbJsonLd, buildPageMetadata } from "@/lib/seo";

export const metadata = buildPageMetadata({
  title: "Shipping & Delivery Policy",
  description: SHIPPING_DOCUMENT.description,
  path: "/shipping",
});

export default function ShippingPage() {
  return (
    <>
      <JsonLd
        data={breadcrumbJsonLd([
          { name: "Home", path: "/" },
          { name: "Shipping & Delivery", path: "/shipping" },
        ])}
      />
      <LegalPage document={SHIPPING_DOCUMENT} />
    </>
  );
}
