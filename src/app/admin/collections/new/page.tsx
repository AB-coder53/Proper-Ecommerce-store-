import { redirect } from "next/navigation";

import { AdminShell } from "@/components/admin/AdminShell";
import { CollectionForm } from "@/components/admin/CollectionForm";
import { getAdminSession } from "@/lib/admin-auth.server";
import { getProducts } from "@/lib/catalog.server";
import { buildPageMetadata } from "@/lib/seo";

export const metadata = buildPageMetadata({
  title: "Add Collection",
  description: "Create a discover collection",
  path: "/admin/collections/new",
  noIndex: true,
});

export default async function NewCollectionPage() {
  const session = await getAdminSession();
  if (!session) redirect("/admin/login");
  const products = await getProducts();

  return (
    <AdminShell username={session.username}>
      <h1 className="font-display text-3xl font-bold">Add collection</h1>
      <div className="mt-8">
        <CollectionForm mode="create" products={products} />
      </div>
    </AdminShell>
  );
}
