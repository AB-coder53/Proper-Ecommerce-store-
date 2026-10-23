"use client";

import { useRouter } from "next/navigation";
import { Archive, ArchiveRestore } from "lucide-react";
import { toast } from "sonner";

import {
  AdminDeleteButton,
  AdminEditLink,
  AdminIconActions,
  AdminIconButton,
  AdminList,
} from "@/components/admin/AdminList";
import { StatusPill } from "@/components/admin/StatusPill";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import type { Product } from "@/lib/catalog-types";

export function ProductsTable({ products }: { products: Product[] }) {
  const active = products.filter((product) => !product.archived);
  const archived = products.filter((product) => product.archived);

  return (
    <Tabs defaultValue="active" className="mt-8">
      <TabsList className="h-10 rounded-full bg-white p-1">
        <TabsTrigger value="active" className="rounded-full px-4">
          Active
          <span className="ml-2 text-xs text-muted-foreground">{active.length}</span>
        </TabsTrigger>
        <TabsTrigger value="archived" className="rounded-full px-4">
          Archived
          <span className="ml-2 text-xs text-muted-foreground">{archived.length}</span>
        </TabsTrigger>
      </TabsList>
      <TabsContent value="active">
        <ProductRows products={active} empty="No active products." />
      </TabsContent>
      <TabsContent value="archived">
        <ProductRows products={archived} empty="No archived products." />
      </TabsContent>
    </Tabs>
  );
}

function ProductRows({ products, empty }: { products: Product[]; empty: string }) {
  const router = useRouter();

  const setArchived = async (product: Product, archived: boolean) => {
    const confirmed = window.confirm(
      archived
        ? `Archive ${product.name}? It will be hidden from the website.`
        : `Unarchive ${product.name}? It will show on the website again.`,
    );
    if (!confirmed) return;
    const res = await fetch(`/api/admin/products/${product.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ archived }),
    });
    const data = (await res.json()) as { error?: string };
    if (!res.ok) {
      toast.error(data.error || "Could not update this product.");
      return;
    }
    toast.success(
      archived ? `${product.name} archived.` : `${product.name} is back on the website.`,
    );
    router.refresh();
  };

  return (
    <AdminList
      rows={products}
      rowKey={(product) => product.id}
      placeholder="Search products"
      empty={empty}
      getSearchText={(product) => `${product.name} ${product.id} ${product.price}`}
      columns={[
        {
          header: "Product",
          cell: (product) => (
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
          ),
        },
        {
          header: "Price",
          className: "hidden sm:table-cell",
          cell: (product) => product.price,
        },
        {
          header: "Status",
          className: "hidden md:table-cell",
          cell: (product) =>
            product.archived ? (
              <StatusPill status="archived">Archived</StatusPill>
            ) : (
              <StatusPill status={product.featured ? "featured" : "standard"}>
                {product.featured ? "Featured" : "Standard"}
              </StatusPill>
            ),
        },
        {
          header: "Actions",
          className: "w-32 text-right",
          cell: (product) => (
            <AdminIconActions>
              <AdminIconButton
                label={product.archived ? "Unarchive" : "Archive"}
                onClick={() => void setArchived(product, !product.archived)}
              >
                {product.archived ? (
                  <ArchiveRestore className="size-4" />
                ) : (
                  <Archive className="size-4" />
                )}
              </AdminIconButton>
              <AdminEditLink href={`/admin/products/${product.id}`} />
              <AdminDeleteButton
                onClick={async () => {
                  if (!window.confirm("Delete this item permanently?")) return;
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
            </AdminIconActions>
          ),
        },
      ]}
    />
  );
}
