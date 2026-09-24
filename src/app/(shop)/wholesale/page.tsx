import { redirect } from "next/navigation";

import { buildPageMetadata } from "@/lib/seo";
import { WHOLESALE_STORE_URL } from "@/lib/site";

export const metadata = buildPageMetadata({
  title: "Wholesale",
  description: "AB Collection B2B plain t-shirt wholesale. Bulk orders from Delhi.",
  path: "/wholesale",
  noIndex: true,
});

/** mrch.in sets X-Frame-Options: sameorigin — iframe embed is blocked; redirect instead. */
export default function WholesalePage() {
  redirect(WHOLESALE_STORE_URL);
}
