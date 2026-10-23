import { AdminPageHeader } from "@/components/admin/AdminPageHeader";
import { BundlesTable } from "@/components/admin/BundlesTable";
import { Button } from "@/components/ui/button";
import { buildPageMetadata } from "@/lib/seo";
import { getBundleOffers } from "@/lib/store-offers.server";
import Link from "next/link";

export const metadata = buildPageMetadata({
  title: "Admin Bundles",
  description: "Manage bundle offers",
  path: "/admin/bundles",
  noIndex: true,
});

export default async function AdminBundlesPage() {
  const bundles = (await getBundleOffers()).filter((offer) => !offer.deletedAt);

  return (
    <>
      <AdminPageHeader
        title="Bundle offers"
        description="Active bundles appear on product pages for included items."
        actions={
          <Button asChild className="rounded-full bg-teal text-teal-foreground hover:bg-teal/90">
            <Link href="/admin/bundles/new">Add bundle</Link>
          </Button>
        }
      />
      <BundlesTable bundles={bundles} />
    </>
  );
}
