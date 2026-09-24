import type { ReactNode } from "react";

import { AppProviders } from "@/components/site/AppProviders";
import { getCatalog } from "@/lib/catalog.server";

export const revalidate = 60;

export default async function ShopLayout({ children }: { children: ReactNode }) {
  const catalog = await getCatalog();
  return <AppProviders catalog={catalog}>{children}</AppProviders>;
}
