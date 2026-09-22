"use client";

import { useEffect, useMemo, useState } from "react";

import type { Product, ProductVariant } from "@/lib/catalog-types";

export function useProductInventory(product: Product) {
  const [variants, setVariants] = useState<ProductVariant[]>(product.variants ?? []);

  useEffect(() => {
    setVariants(product.variants ?? []);
  }, [product]);

  useEffect(() => {
    let cancelled = false;
    const load = async () => {
      try {
        const res = await fetch(`/api/inventory/${encodeURIComponent(product.id)}`, {
          cache: "no-store",
        });
        if (!res.ok || cancelled) return;
        const data = (await res.json()) as { variants?: ProductVariant[] };
        if (!cancelled && Array.isArray(data.variants)) {
          setVariants(
            data.variants.map((row) => ({
              id: row.id,
              sku: row.sku,
              color: row.color,
              size: row.size,
              stock: Number(row.stock ?? 0),
            })),
          );
        }
      } catch {
        /* keep last known catalog stock */
      }
    };

    if (!product.variants?.length) void load();

    const onFocus = () => {
      if (document.visibilityState === "visible") void load();
    };
    window.addEventListener("focus", onFocus);
    document.addEventListener("visibilitychange", onFocus);
    return () => {
      cancelled = true;
      window.removeEventListener("focus", onFocus);
      document.removeEventListener("visibilitychange", onFocus);
    };
  }, [product.id, product.variants?.length]);

  return useMemo(() => ({ ...product, variants }), [product, variants]);
}
