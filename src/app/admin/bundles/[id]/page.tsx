import { notFound, redirect } from "next/navigation";

import { AdminShell } from "@/components/admin/AdminShell";
import { BundleForm } from "@/components/admin/BundleForm";
import { getAdminSession } from "@/lib/admin-auth.server";
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
  const session = await getAdminSession();
  if (!session) redirect("/admin/login");
  const { id } = await params;
  const [bundle, products] = await Promise.all([getBundleOfferById(id), getProducts()]);
  if (!bundle) notFound();

  return (
    <AdminShell username={session.username}>
      <h1 className="font-display text-3xl font-bold">Edit bundle</h1>
      <p className="mt-1 text-sm text-muted-foreground">{bundle.title}</p>
      <div className="mt-8">
        <BundleForm mode="edit" initial={bundle} products={products} />
      </div>
    </AdminShell>
  );
}
