import Link from "next/link";

import { AdminPageHeader } from "@/components/admin/AdminPageHeader";
import { CollectionsTable } from "@/components/admin/CollectionsTable";
import { Button } from "@/components/ui/button";
import { getCollections } from "@/lib/catalog.server";
import { buildPageMetadata } from "@/lib/seo";

export const metadata = buildPageMetadata({
  title: "Admin Collections",
  description: "Manage discover collections",
  path: "/admin/collections",
  noIndex: true,
});

export default async function AdminCollectionsPage() {
  const collections = await getCollections();

  return (
    <>
      <AdminPageHeader
        title="Collections"
        description="These appear in the Discover Collection section on the homepage."
        actions={
          <Button asChild className="rounded-full bg-teal text-teal-foreground hover:bg-teal/90">
            <Link href="/admin/collections/new">Add collection</Link>
          </Button>
        }
      />
      <CollectionsTable collections={collections} />
    </>
  );
}
