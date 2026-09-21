import { PrivilegeLanding } from "@/components/privilege/PrivilegeLanding";
import { buildPageMetadata } from "@/lib/seo";

export const metadata = buildPageMetadata({
  title: "₹100 Privilege Grant — Istefada Special",
  description:
    "Unlock your exclusive ₹100 AB Collection privilege grant. Visit the main store to shop with automatic savings at checkout.",
  path: "/istefada",
  image: "/images/hero-beige.png",
});

export default function IstefadaPage() {
  return <PrivilegeLanding />;
}
