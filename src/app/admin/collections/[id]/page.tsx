import { notFound, redirect } from "next/navigation";

import { AdminShell } from "@/components/admin/AdminShell";
import { CollectionForm } from "@/components/admin/CollectionForm";
import { getAdminSession } from "@/lib/admin-auth.server";
import { getCollectionById, getProducts } from "@/lib/catalog.server";
import { buildPageMetadata } from "@/lib/seo";

type Props = { params: Promise<{ id: string }> };

export async function generateMetadata({ params }: Props) {
  const { id } = await params;
  return buildPageMetadata({
    title: `Edit collection ${id}`,
    description: "Edit collection",
    path: `/admin/collections/${id}`,
    noIndex: true,
  });
}

export default async function EditCollectionPage({ params }: Props) {
  const session = await getAdminSession();
  if (!session) redirect("/admin/login");
  const { id } = await params;
  const [collection, products] = await Promise.all([getCollectionById(id), getProducts()]);
  if (!collection) notFound();

  return (
    <AdminShell username={session.username}>
      <h1 className="font-display text-3xl font-bold">Edit collection</h1>
      <p className="mt-1 text-sm text-muted-foreground">{collection.title}</p>
      <div className="mt-8">
        <CollectionForm mode="edit" initial={collection} products={products} />
      </div>
    </AdminShell>
  );
}
