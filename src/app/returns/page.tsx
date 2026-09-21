import { LegalPage } from "@/components/legal/LegalPage";
import { RETURNS_DOCUMENT } from "@/lib/legal/content";
import { JsonLd, breadcrumbJsonLd, buildPageMetadata } from "@/lib/seo";

export const metadata = buildPageMetadata({
  title: "Refund, Return & Cancellation Policy",
  description: RETURNS_DOCUMENT.description,
  path: "/returns",
});

export default function ReturnsPage() {
  return (
    <>
      <JsonLd
        data={breadcrumbJsonLd([
          { name: "Home", path: "/" },
          { name: "Refund & Returns", path: "/returns" },
        ])}
      />
      <LegalPage document={RETURNS_DOCUMENT} />
    </>
  );
}
