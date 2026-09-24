import Link from "next/link";
import { redirect } from "next/navigation";

import { AdminShell } from "@/components/admin/AdminShell";
import { CollectionsTable } from "@/components/admin/CollectionsTable";
import { getAdminSession } from "@/lib/admin-auth.server";
import { headerCtaClassName } from "@/lib/button-styles";
import { getCollections } from "@/lib/catalog.server";
import { buildPageMetadata } from "@/lib/seo";

export const metadata = buildPageMetadata({
  title: "Admin Collections",
  description: "Manage discover collections",
  path: "/admin/collections",
  noIndex: true,
});

export default async function AdminCollectionsPage() {
  const session = await getAdminSession();
  if (!session) redirect("/admin/login");
  const collections = await getCollections();

  return (
    <AdminShell username={session.username}>
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="font-display text-3xl font-bold">Collections</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            These appear in the Discover Collection section on the homepage.
          </p>
        </div>
        <Link href="/admin/collections/new" className={headerCtaClassName}>
          Add collection
        </Link>
      </div>
      <div className="mt-8">
        <CollectionsTable collections={collections} />
      </div>
    </AdminShell>
  );
}
