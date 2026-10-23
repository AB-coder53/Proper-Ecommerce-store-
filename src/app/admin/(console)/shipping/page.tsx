import { AdminPageHeader } from "@/components/admin/AdminPageHeader";
import { ShippingSettingsForm } from "@/components/admin/ShippingSettingsForm";
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
  const [settings, products] = await Promise.all([getShippingSettings(), getProducts()]);

  return (
    <>
      <AdminPageHeader
        title="Shipping & delivery"
        description="Defaults match the published Shipping Policy: 2–3 business days processing and 5–7 business days in transit. Estimates skip Sundays when business-day counting is on."
      />
      <div className="mt-8">
        <ShippingSettingsForm initial={settings} products={products} />
      </div>
    </>
  );
}
