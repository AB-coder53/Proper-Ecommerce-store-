"use client";

import { AdminEditLink, AdminIconActions, AdminList } from "@/components/admin/AdminList";
import { StatusPill } from "@/components/admin/StatusPill";
import { formatInr } from "@/lib/price";
import { bundleOfferStatus, type BundleOffer } from "@/lib/store-offers";

export function BundlesTable({ bundles }: { bundles: BundleOffer[] }) {
  return (
    <AdminList
      rows={bundles}
      rowKey={(bundle) => bundle.id}
      placeholder="Search bundles"
      empty="No bundle offers configured."
      getSearchText={(bundle) => `${bundle.title} ${bundle.id} ${bundleOfferStatus(bundle)}`}
      columns={[
        {
          header: "Title",
          cell: (bundle) => <span className="font-medium">{bundle.title}</span>,
        },
        {
          header: "Price",
          cell: (bundle) =>
            (bundle.pricingType ?? "fixed") === "percent"
              ? `${bundle.discountPercent}% off`
              : formatInr(bundle.bundlePrice),
        },
        { header: "Items", cell: (bundle) => bundle.productIds.length },
        {
          header: "Status",
          cell: (bundle) => {
            const status = bundleOfferStatus(bundle);
            return <StatusPill status={status}>{status}</StatusPill>;
          },
        },
        {
          header: "Actions",
          className: "w-16 text-right",
          cell: (bundle) => (
            <AdminIconActions>
              <AdminEditLink href={`/admin/bundles/${bundle.id}`} />
            </AdminIconActions>
          ),
        },
      ]}
    />
  );
}
