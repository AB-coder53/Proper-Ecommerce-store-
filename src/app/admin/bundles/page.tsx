import Link from "next/link";
import { redirect } from "next/navigation";

import { AdminShell } from "@/components/admin/AdminShell";
import { getAdminSession } from "@/lib/admin-auth.server";
import { headerCtaClassName, pillLinkClassName } from "@/lib/button-styles";
import { buildPageMetadata } from "@/lib/seo";
import { formatInr } from "@/lib/price";
import { bundleOfferStatus } from "@/lib/store-offers";
import { getBundleOffers } from "@/lib/store-offers.server";

export const metadata = buildPageMetadata({
  title: "Admin Bundles",
  description: "Manage bundle offers",
  path: "/admin/bundles",
  noIndex: true,
});

export default async function AdminBundlesPage() {
  const session = await getAdminSession();
  if (!session) redirect("/admin/login");
  const bundles = (await getBundleOffers()).filter((offer) => !offer.deletedAt);

  return (
    <AdminShell username={session.username}>
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="font-display text-3xl font-bold">Bundle offers</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Active bundles appear on product pages for included items.
          </p>
        </div>
        <Link href="/admin/bundles/new" className={headerCtaClassName}>
          Add bundle
        </Link>
      </div>

      <div className="mt-8 overflow-x-auto rounded-3xl border border-border bg-white">
        <table className="min-w-full text-sm">
          <thead className="border-b border-border text-left text-muted-foreground">
            <tr>
              <th className="px-4 py-3 font-medium">Title</th>
              <th className="px-4 py-3 font-medium">Price</th>
              <th className="px-4 py-3 font-medium">Items</th>
              <th className="px-4 py-3 font-medium">Status</th>
              <th className="px-4 py-3 font-medium" />
            </tr>
          </thead>
          <tbody>
            {bundles.length ? (
              bundles.map((bundle) => (
                <tr key={bundle.id} className="border-b border-border last:border-0">
                  <td className="px-4 py-3 font-medium">{bundle.title}</td>
                  <td className="px-4 py-3">
                    {(bundle.pricingType ?? "fixed") === "percent"
                      ? `${bundle.discountPercent}% off`
                      : formatInr(bundle.bundlePrice)}
                  </td>
                  <td className="px-4 py-3">{bundle.productIds.length}</td>
                  <td className="px-4 py-3 capitalize">{bundleOfferStatus(bundle)}</td>
                  <td className="px-4 py-3 text-right">
                    <Link href={`/admin/bundles/${bundle.id}`} className={pillLinkClassName}>
                      Edit
                    </Link>
                  </td>
                </tr>
              ))
            ) : (
              <tr>
                <td colSpan={5} className="px-4 py-8 text-center text-muted-foreground">
                  No bundle offers configured.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </AdminShell>
  );
}
