import { notFound } from "next/navigation";

import { AdminPageHeader } from "@/components/admin/AdminPageHeader";
import { CollectionForm } from "@/components/admin/CollectionForm";
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
  const { id } = await params;
  const [collection, products] = await Promise.all([getCollectionById(id), getProducts()]);
  if (!collection) notFound();

  return (
    <>
      <AdminPageHeader title="Edit collection" description={collection.title} />
      <div className="mt-8">
        <CollectionForm mode="edit" initial={collection} products={products} />
      </div>
    </>
  );
}
