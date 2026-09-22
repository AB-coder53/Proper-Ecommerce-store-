"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";

import type { Catalog, Collection, Product } from "@/lib/catalog-types";

type CatalogContextValue = {
  products: Product[];
  collections: Collection[];
  ready: boolean;
  refresh: (live?: boolean) => Promise<void>;
};

const CatalogContext = createContext<CatalogContextValue | null>(null);

export function CatalogProvider({ children, initial }: { children: ReactNode; initial?: Catalog }) {
  const [catalog, setCatalog] = useState<Catalog>(initial ?? { products: [], collections: [] });
  const [ready, setReady] = useState(Boolean(initial));

  const refresh = useCallback(async (live = false) => {
    const res = await fetch(live ? "/api/catalog?live=1" : "/api/catalog", { cache: "no-store" });
    if (!res.ok) return;
    const data = (await res.json()) as Catalog;
    setCatalog(data);
    setReady(true);
  }, []);

  useEffect(() => {
    if (!initial) void refresh();
  }, [initial, refresh]);

  const value = useMemo(
    () => ({
      products: catalog.products,
      collections: catalog.collections,
      ready,
      refresh,
    }),
    [catalog, ready, refresh],
  );

  return <CatalogContext.Provider value={value}>{children}</CatalogContext.Provider>;
}

export function useCatalog() {
  const ctx = useContext(CatalogContext);
  if (!ctx) throw new Error("useCatalog must be used within CatalogProvider");
  return ctx;
}
