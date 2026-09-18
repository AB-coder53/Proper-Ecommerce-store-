"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";

import { DangerButton } from "@/components/admin/AdminFields";
import type { Product } from "@/lib/catalog-types";

export function ProductsTable({ products }: { products: Product[] }) {
  const router = useRouter();

  return (
    <div className="overflow-hidden rounded-3xl border border-border bg-white">
      <table className="w-full text-left text-sm">
        <thead className="border-b border-border bg-muted/50">
          <tr>
            <th className="px-4 py-3 font-semibold">Product</th>
            <th className="hidden px-4 py-3 font-semibold sm:table-cell">Price</th>
            <th className="hidden px-4 py-3 font-semibold md:table-cell">Featured</th>
            <th className="px-4 py-3 font-semibold">Actions</th>
          </tr>
        </thead>
        <tbody>
          {products.map((product) => (
            <tr key={product.id} className="border-b border-border last:border-0">
              <td className="px-4 py-3">
                <div className="flex items-center gap-3">
                  <img
                    src={product.image}
                    alt=""
                    className="size-12 rounded-lg object-cover object-top"
                  />
                  <div>
                    <p className="font-medium">{product.name}</p>
                    <p className="text-xs text-muted-foreground">{product.id}</p>
                  </div>
                </div>
              </td>
              <td className="hidden px-4 py-3 sm:table-cell">{product.price}</td>
              <td className="hidden px-4 py-3 md:table-cell">{product.featured ? "Yes" : "No"}</td>
              <td className="px-4 py-3">
                <div className="flex flex-wrap gap-2">
                  <Link
                    href={`/admin/products/${product.id}`}
                    className="rounded-full border border-border px-3 py-1.5 text-xs font-semibold"
                  >
                    Edit
                  </Link>
                  <DangerButton
                    label="Delete"
                    onConfirm={async () => {
                      const res = await fetch(`/api/admin/products/${product.id}`, {
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
