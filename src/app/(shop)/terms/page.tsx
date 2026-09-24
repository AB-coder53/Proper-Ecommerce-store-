import { LegalPage } from "@/components/legal/LegalPage";
import { TERMS_DOCUMENT } from "@/lib/legal/content";
import { JsonLd, breadcrumbJsonLd, buildPageMetadata } from "@/lib/seo";

export const metadata = buildPageMetadata({
  title: "Terms & Conditions",
  description: TERMS_DOCUMENT.description,
  path: "/terms",
});

export default function TermsPage() {
  return (
    <>
      <JsonLd
        data={breadcrumbJsonLd([
          { name: "Home", path: "/" },
          { name: "Terms & Conditions", path: "/terms" },
        ])}
      />
      <LegalPage document={TERMS_DOCUMENT} />
    </>
  );
}
