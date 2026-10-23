import { AdminPageHeader } from "@/components/admin/AdminPageHeader";
import { InventorySheet, type InventoryColorRow } from "@/components/admin/InventorySheet";
import { getAdminProducts } from "@/lib/catalog.server";
import { SIZES } from "@/lib/catalog-types";
import { listVariantNetDeltas } from "@/lib/inventory.server";
import { buildPageMetadata } from "@/lib/seo";

export const metadata = buildPageMetadata({
  title: "Inventory",
  description: "Colour and size stock for AB Collection",
  path: "/admin/inventory",
  noIndex: true,
});

export const dynamic = "force-dynamic";

export default async function AdminInventoryPage() {
  const [products, deltas] = await Promise.all([getAdminProducts(), listVariantNetDeltas()]);
  const extraSizes = [
    ...new Set(
      products.flatMap((product) =>
        [...product.sizes, ...product.variants.map((variant) => variant.size)].filter(
          (size) => !SIZES.includes(size),
        ),
      ),
    ),
  ];
  const columns = [...SIZES, ...extraSizes];

  const rows: InventoryColorRow[] = products.flatMap((product) => {
    const colors = [
      ...new Set([...product.colors, ...product.variants.map((variant) => variant.color)]),
    ];
    return colors.map((color) => {
      const sizes = Object.fromEntries(
        columns.map((size) => {
          const variant = product.variants.find((row) => row.color === color && row.size === size);
          const offered = product.sizes.includes(size) || Boolean(variant);
          return [
            size,
            {
              variantId: variant?.id ?? null,
              stock: variant?.stock ?? 0,
              offered,
            },
          ];
        }),
      );
      const opening = Math.max(
        0,
        columns.reduce((sum, size) => {
          const cell = sizes[size];
          if (!cell?.offered) return sum;
          const net = cell.variantId ? (deltas.get(cell.variantId) ?? 0) : 0;
          return sum + (cell.stock - net);
        }, 0),
      );
      return {
        key: `${product.id}:${color}`,
        productId: product.id,
        productName: product.name,
        category: product.fabric,
        color,
        image:
          product.colorImages?.find((entry) => entry.color === color)?.images.find(Boolean) ||
          product.image,
        opening,
        sizes,
      };
    });
  });

  return (
    <>
      <AdminPageHeader
        title="Inventory"
        description="One row is one colour of a product. Each size has its own count. A completed order reduces that size on its own. Opening is the count before those changes, and current total is what is left."
      />
      <InventorySheet initialRows={rows} columns={columns} />
    </>
  );
}
