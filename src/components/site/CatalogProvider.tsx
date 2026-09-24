"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from "react";

import type { Catalog, Collection, Product } from "@/lib/catalog-types";

const CATALOG_STALE_MS = 60_000;

type CatalogContextValue = {
  products: Product[];
  collections: Collection[];
  ready: boolean;
  refresh: (live?: boolean) => Promise<void>;
};

const CatalogContext = createContext<CatalogContextValue | null>(null);

let clientCatalog: Catalog | null = null;
let clientCatalogAt = 0;

function emptyCatalog(): Catalog {
  return { products: [], collections: [] };
}

export function CatalogProvider({ children, initial }: { children: ReactNode; initial?: Catalog }) {
  const [catalog, setCatalog] = useState<Catalog>(() => {
    if (clientCatalog) return clientCatalog;
    if (initial) {
      clientCatalog = initial;
      clientCatalogAt = Date.now();
      return initial;
    }
    return emptyCatalog();
  });
  const [ready, setReady] = useState(Boolean(clientCatalog || initial));
  const hydrated = useRef(Boolean(clientCatalog || initial));

  const refresh = useCallback(async (live = false) => {
    const res = await fetch(live ? "/api/catalog?live=1" : "/api/catalog", { cache: "no-store" });
    if (!res.ok) return;
    const data = (await res.json()) as Catalog;
    clientCatalog = data;
    clientCatalogAt = Date.now();
    setCatalog(data);
    setReady(true);
  }, []);

  useEffect(() => {
    if (!hydrated.current && initial) {
      clientCatalog = initial;
      clientCatalogAt = Date.now();
      setCatalog(initial);
      setReady(true);
      hydrated.current = true;
    }
    if (!clientCatalog && !initial) {
      void refresh();
      return;
    }
    if (Date.now() - clientCatalogAt > CATALOG_STALE_MS) {
      void refresh();
    }
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
