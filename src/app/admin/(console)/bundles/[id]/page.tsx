import { notFound } from "next/navigation";

import { AdminPageHeader } from "@/components/admin/AdminPageHeader";
import { BundleForm } from "@/components/admin/BundleForm";
import { getProducts } from "@/lib/catalog.server";
import { buildPageMetadata } from "@/lib/seo";
import { getBundleOfferById } from "@/lib/store-offers.server";

type Props = { params: Promise<{ id: string }> };

export async function generateMetadata({ params }: Props) {
  const { id } = await params;
  return buildPageMetadata({
    title: `Edit ${id}`,
    description: "Edit bundle offer",
    path: `/admin/bundles/${id}`,
    noIndex: true,
  });
}

export default async function EditBundlePage({ params }: Props) {
  const { id } = await params;
  const [bundle, products] = await Promise.all([getBundleOfferById(id), getProducts()]);
  if (!bundle) notFound();

  return (
    <>
      <AdminPageHeader title="Edit bundle" description={bundle.title} />
      <div className="mt-8">
        <BundleForm mode="edit" initial={bundle} products={products} />
      </div>
    </>
  );
}
