import { FaqContent } from "@/app/faq/FaqContent";
import { FAQS } from "@/lib/site";
import { JsonLd, breadcrumbJsonLd, buildPageMetadata, faqJsonLd } from "@/lib/seo";

export const metadata = buildPageMetadata({
  title: "FAQ",
  description:
    "Answers about AB Collection's launch timeline, 10% pre-launch discount, sizing, payment, and how we use your details.",
  path: "/faq",
});

export default function FaqPage() {
  return (
    <>
      <JsonLd
        data={[
          breadcrumbJsonLd([
            { name: "Home", path: "/" },
            { name: "FAQ", path: "/faq" },
          ]),
          faqJsonLd(FAQS),
        ]}
      />
      <FaqContent />
    </>
  );
}
