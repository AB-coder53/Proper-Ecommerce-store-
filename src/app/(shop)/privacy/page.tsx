import { LegalPage } from "@/components/legal/LegalPage";
import { PRIVACY_DOCUMENT } from "@/lib/legal/content";
import { JsonLd, breadcrumbJsonLd, buildPageMetadata } from "@/lib/seo";

export const metadata = buildPageMetadata({
  title: "Privacy Policy",
  description: PRIVACY_DOCUMENT.description,
  path: "/privacy",
});

export default function PrivacyPage() {
  return (
    <>
      <JsonLd
        data={breadcrumbJsonLd([
          { name: "Home", path: "/" },
          { name: "Privacy Policy", path: "/privacy" },
        ])}
      />
      <LegalPage document={PRIVACY_DOCUMENT} />
    </>
  );
}
