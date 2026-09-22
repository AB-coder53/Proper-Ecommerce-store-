import { redirect } from "next/navigation";

import { AdminShell } from "@/components/admin/AdminShell";
import { ShippingSettingsForm } from "@/components/admin/ShippingSettingsForm";
import { getAdminSession } from "@/lib/admin-auth.server";
import { getProducts } from "@/lib/catalog.server";
import { buildPageMetadata } from "@/lib/seo";
import { getShippingSettings } from "@/lib/shipping.server";

export const metadata = buildPageMetadata({
  title: "Admin Shipping",
  description: "Manage delivery estimates",
  path: "/admin/shipping",
  noIndex: true,
});

export default async function AdminShippingPage() {
  const session = await getAdminSession();
  if (!session) redirect("/admin/login");
  const [settings, products] = await Promise.all([getShippingSettings(), getProducts()]);

  return (
    <AdminShell username={session.username}>
      <h1 className="font-display text-3xl font-bold">Shipping & delivery</h1>
      <p className="mt-1 text-sm text-muted-foreground">
        Defaults match the published Shipping Policy: 2–3 business days processing and 5–7 business
        days in transit. Estimates skip Sundays when business-day counting is on.
      </p>
      <div className="mt-8">
        <ShippingSettingsForm initial={settings} products={products} />
      </div>
    </AdminShell>
  );
}
