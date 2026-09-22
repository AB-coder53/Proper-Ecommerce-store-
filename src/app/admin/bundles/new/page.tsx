import { redirect } from "next/navigation";

import { AdminShell } from "@/components/admin/AdminShell";
import { BundleForm } from "@/components/admin/BundleForm";
import { getAdminSession } from "@/lib/admin-auth.server";
import { getProducts } from "@/lib/catalog.server";
import { buildPageMetadata } from "@/lib/seo";

export const metadata = buildPageMetadata({
  title: "Add bundle",
  description: "Create a bundle offer",
  path: "/admin/bundles/new",
  noIndex: true,
});

export default async function NewBundlePage() {
  const session = await getAdminSession();
  if (!session) redirect("/admin/login");
  const products = await getProducts();

  return (
    <AdminShell username={session.username}>
      <h1 className="font-display text-3xl font-bold">Add bundle</h1>
      <div className="mt-8">
        <BundleForm mode="create" products={products} />
      </div>
    </AdminShell>
  );
}
