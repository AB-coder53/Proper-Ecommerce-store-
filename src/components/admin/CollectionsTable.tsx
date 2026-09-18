"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";

import { DangerButton } from "@/components/admin/AdminFields";
import type { Collection } from "@/lib/catalog-types";

export function CollectionsTable({ collections }: { collections: Collection[] }) {
  const router = useRouter();

  return (
    <div className="overflow-hidden rounded-3xl border border-border bg-white">
      <table className="w-full text-left text-sm">
        <thead className="border-b border-border bg-muted/50">
          <tr>
            <th className="px-4 py-3 font-semibold">Collection</th>
            <th className="hidden px-4 py-3 font-semibold sm:table-cell">Linked product</th>
            <th className="px-4 py-3 font-semibold">Actions</th>
          </tr>
        </thead>
        <tbody>
          {collections.map((collection) => (
            <tr key={collection.id} className="border-b border-border last:border-0">
              <td className="px-4 py-3">
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
              </td>
              <td className="hidden px-4 py-3 sm:table-cell">{collection.productId || "—"}</td>
              <td className="px-4 py-3">
                <div className="flex flex-wrap gap-2">
                  <Link
                    href={`/admin/collections/${collection.id}`}
                    className="rounded-full border border-border px-3 py-1.5 text-xs font-semibold"
                  >
                    Edit
                  </Link>
                  <DangerButton
                    label="Delete"
                    onConfirm={async () => {
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
                </div>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
