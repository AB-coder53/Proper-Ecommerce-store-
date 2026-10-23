"use client";

import { useRouter } from "next/navigation";

import {
  AdminDeleteButton,
  AdminEditLink,
  AdminIconActions,
  AdminList,
} from "@/components/admin/AdminList";
import type { Collection } from "@/lib/catalog-types";

export function CollectionsTable({ collections }: { collections: Collection[] }) {
  const router = useRouter();

  return (
    <AdminList
      rows={collections}
      rowKey={(collection) => collection.id}
      placeholder="Search collections"
      empty="No collections yet."
      getSearchText={(collection) =>
        `${collection.title} ${collection.id} ${collection.productId ?? ""}`
      }
      columns={[
        {
          header: "Collection",
          cell: (collection) => (
            <div className="flex items-center gap-3">
              <img
                src={collection.image}
                alt=""
                className="size-12 rounded-lg object-cover object-top"
              />
              <div>
                <p className="font-medium">{collection.title}</p>
                <p className="text-xs text-muted-foreground">{collection.id}</p>
              </div>
            </div>
          ),
        },
        {
          header: "Linked product",
          className: "hidden sm:table-cell",
          cell: (collection) => collection.productId || "—",
        },
        {
          header: "Actions",
          className: "w-24 text-right",
          cell: (collection) => (
            <AdminIconActions>
              <AdminEditLink href={`/admin/collections/${collection.id}`} />
              <AdminDeleteButton
                onClick={async () => {
                  if (!window.confirm("Delete this item permanently?")) return;
                  const res = await fetch(`/api/admin/collections/${collection.id}`, {
                    method: "DELETE",
                  });
                  if (!res.ok) {
                    const data = (await res.json()) as { error?: string };
                    window.alert(data.error ?? "Delete failed");
                    return;
                  }
                  router.refresh();
                }}
              />
            </AdminIconActions>
          ),
        },
      ]}
    />
  );
}
