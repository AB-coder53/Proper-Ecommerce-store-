import "server-only";

import { cache } from "react";
import { revalidatePath } from "next/cache";
import { promises as fs } from "fs";
import path from "path";

import type { Database } from "@/integrations/supabase/types";
import type { Catalog, Collection, Product } from "@/lib/catalog-types";
import { attachInventory, syncProductVariants } from "@/lib/inventory.server";
import { parsePriceInr } from "@/lib/price";
import { attachProductBadges, setProductBadges } from "@/lib/promotions.server";
import { getSupabaseReadClient, getSupabaseWriteClient } from "@/lib/supabase-catalog.server";

type ProductRow = Database["public"]["Tables"]["products"]["Row"];
type CollectionRow = Database["public"]["Tables"]["collections"]["Row"];
type ProductInsert = Database["public"]["Tables"]["products"]["Insert"];
type CollectionInsert = Database["public"]["Tables"]["collections"]["Insert"];

const FALLBACK_PATH = path.join(process.cwd(), "data", "catalog.json");

/** "supabase" once tables exist, "json" when tables are missing / unreachable. */
let catalogSource: "unknown" | "supabase" | "json" = "unknown";

const CATALOG_TTL_MS = 30_000;
let memoryCatalog: { value: Catalog; expiresAt: number } | null = null;

export function invalidateCatalogCache() {
  memoryCatalog = null;
  revalidatePath("/", "layout");
  revalidatePath("/collection");
}

function mapProduct(row: ProductRow): Product {
  const extra = row as ProductRow & { compare_at_price?: string | null };
  return {
    id: row.id,
    name: row.name,
    fabric: row.fabric,
    image: row.image,
    images: row.images ?? [],
    tagline: row.tagline,
    description: row.description,
    details: row.details ?? [],
    colors: row.colors ?? [],
    sizes: row.sizes ?? [],
    price: row.price,
    compareAtPrice: extra.compare_at_price ?? "",
    badge: row.badge ?? "",
    badgeIds: [],
    sizeChart: row.size_chart ?? "",
    featured: row.featured,
    sortOrder: row.sort_order,
    variants: [],
    badges: [],
  };
}

function mapCollection(row: CollectionRow): Collection {
  return {
    id: row.id,
    title: row.title,
    image: row.image,
    productId: row.product_id ?? "",
    tint: row.tint,
    sortOrder: row.sort_order,
  };
}

function toProductInsert(product: Product): ProductInsert {
  const images = product.images.length > 0 ? product.images : [product.image];
  return {
    id: product.id,
    name: product.name,
    fabric: product.fabric,
    image: product.image || images[0] || "",
    images,
    tagline: product.tagline,
    description: product.description,
    details: product.details,
    colors: product.colors,
    sizes: product.sizes,
    price: product.price,
    badge: product.badge || null,
    size_chart: product.sizeChart?.trim() || null,
    featured: product.featured,
    sort_order: product.sortOrder,
    compare_at_price: product.compareAtPrice?.trim() || null,
  } as ProductInsert;
}

function toCollectionInsert(collection: Collection): CollectionInsert {
  return {
    id: collection.id,
    title: collection.title,
    image: collection.image,
    product_id: collection.productId || null,
    tint: collection.tint,
    sort_order: collection.sortOrder,
  };
}

function isMissingTableError(error: unknown): boolean {
  if (!error || typeof error !== "object") return false;
  const code = "code" in error ? String((error as { code?: unknown }).code ?? "") : "";
  const message = "message" in error ? String((error as { message?: unknown }).message ?? "") : "";
  return (
    code === "PGRST205" ||
    code === "42P01" ||
    message.includes("Could not find the table") ||
    message.includes("does not exist")
  );
}

async function readFallbackCatalog(): Promise<Catalog> {
  const raw = await fs.readFile(FALLBACK_PATH, "utf8");
  const data = JSON.parse(raw) as Catalog;
  const products = [...(data.products ?? [])]
    .map((product) => ({ ...product, variants: product.variants ?? [] }))
    .sort((a, b) => a.sortOrder - b.sortOrder || a.name.localeCompare(b.name));
  return {
    products: await attachProductBadges(await attachInventory(products)),
    collections: [...(data.collections ?? [])].sort(
      (a, b) => a.sortOrder - b.sortOrder || a.title.localeCompare(b.title),
    ),
  };
}

async function readSupabaseCatalog(): Promise<Catalog> {
  const supabase = getSupabaseReadClient();
  const [productsRes, collectionsRes] = await Promise.all([
    supabase.from("products").select("*").order("sort_order", { ascending: true }).order("name", {
      ascending: true,
    }),
    supabase
      .from("collections")
      .select("*")
      .order("sort_order", { ascending: true })
      .order("title", { ascending: true }),
  ]);

  if (productsRes.error) throw productsRes.error;
  if (collectionsRes.error) throw collectionsRes.error;

  const catalog = {
    products: (productsRes.data ?? []).map(mapProduct),
    collections: (collectionsRes.data ?? []).map(mapCollection),
  };
  return {
    ...catalog,
    products: await attachProductBadges(await attachInventory(catalog.products)),
  };
}

async function resolveCatalog(): Promise<Catalog> {
  if (catalogSource === "json") {
    return readFallbackCatalog();
  }

  try {
    const catalog = await readSupabaseCatalog();
    catalogSource = "supabase";
    return catalog;
  } catch (error) {
    // Tables not migrated yet — use local JSON quietly (no console.error / overlay noise).
    if (isMissingTableError(error) || catalogSource !== "supabase") {
      catalogSource = "json";
      return readFallbackCatalog();
    }
    throw error;
  }
}

async function loadCatalog(): Promise<Catalog> {
  const now = Date.now();
  if (memoryCatalog && memoryCatalog.expiresAt > now) {
    return memoryCatalog.value;
  }
  const value = await resolveCatalog();
  memoryCatalog = { value, expiresAt: now + CATALOG_TTL_MS };
  return value;
}

/** Dedupes catalog reads within a single request (layout + page). */
export const getCatalog = cache(loadCatalog);

export async function getProducts(): Promise<Product[]> {
  return (await getCatalog()).products;
}

export async function getProductById(id: string): Promise<Product | undefined> {
  const products = await getProducts();
  return products.find((p) => p.id === id);
}

export async function getAllProductIds(): Promise<string[]> {
  return (await getProducts()).map((p) => p.id);
}

export async function getCollections(): Promise<Collection[]> {
  return (await getCatalog()).collections;
}

export async function getCollectionById(id: string): Promise<Collection | undefined> {
  const collections = await getCollections();
  return collections.find((c) => c.id === id);
}

export async function saveProduct(product: Product, mode: "create" | "update") {
  if (catalogSource === "json") {
    throw new Error(
      "Supabase products table is not available. Run supabase/migrations/20260812100000_products_collections.sql and set SUPABASE_SERVICE_ROLE_KEY.",
    );
  }

  const existing = await getProductById(product.id);
  if (mode === "create" && existing) throw new Error("A product with this id already exists");
  if (mode === "update" && !existing) throw new Error("Product not found");

  const selling = parsePriceInr(product.price);
  const compareAt = parsePriceInr(product.compareAtPrice);
  if (compareAt > 0 && selling > 0 && selling > compareAt) {
    throw new Error("Selling price cannot be higher than the compare-at price.");
  }

  const supabase = getSupabaseWriteClient();
  const payload = toProductInsert(product);

  const persist = async (body: ProductInsert) => {
    if (mode === "create") {
      return supabase.from("products").insert(body).select("*").single();
    }
    return supabase.from("products").update(body).eq("id", product.id).select("*").single();
  };

  let { data, error } = await persist(payload);
  if (error && /compare_at_price/.test(error.message)) {
    const { compare_at_price: _ignored, ...withoutCompare } = payload as ProductInsert & {
      compare_at_price?: string | null;
    };
    void _ignored;
    ({ data, error } = await persist(withoutCompare));
  }
  if (error && /size_chart/.test(error.message)) {
    const { size_chart: _ignored, ...withoutChart } = payload;
    void _ignored;
    ({ data, error } = await persist(withoutChart));
  }
  if (error || !data) throw new Error(error?.message ?? "Could not save product");
  if (mode === "create") catalogSource = "supabase";
  const mapped = mapProduct(data);
  await syncProductVariants({ ...product, id: mapped.id });
  await setProductBadges(mapped.id, product.badgeIds ?? []);
  invalidateCatalogCache();
  revalidatePath(`/collection/${product.id}`);
  const withStock = await attachProductBadges(await attachInventory([mapped]));
  return withStock[0] ?? mapped;
}

export async function deleteProduct(id: string) {
  if (catalogSource === "json") {
    throw new Error(
      "Supabase products table is not available. Run the catalogue migration and set SUPABASE_SERVICE_ROLE_KEY.",
    );
  }

  const existing = await getProductById(id);
  if (!existing) throw new Error("Product not found");

  const supabase = getSupabaseWriteClient();
  await supabase.from("collections").update({ product_id: null }).eq("product_id", id);
  const { error } = await supabase.from("products").delete().eq("id", id);
  if (error) throw new Error(error.message);
  invalidateCatalogCache();
  revalidatePath(`/collection/${id}`);
}

export async function saveCollection(collection: Collection, mode: "create" | "update") {
  if (catalogSource === "json") {
    throw new Error(
      "Supabase collections table is not available. Run the catalogue migration and set SUPABASE_SERVICE_ROLE_KEY.",
    );
  }

  const existing = await getCollectionById(collection.id);
  if (mode === "create" && existing) throw new Error("A collection with this id already exists");
  if (mode === "update" && !existing) throw new Error("Collection not found");

  if (collection.productId) {
    const linked = await getProductById(collection.productId);
    if (!linked) throw new Error("Linked product id does not exist");
  }

  const supabase = getSupabaseWriteClient();
  const payload = toCollectionInsert(collection);

  if (mode === "create") {
    const { data, error } = await supabase.from("collections").insert(payload).select("*").single();
    if (error) throw new Error(error.message);
    catalogSource = "supabase";
    invalidateCatalogCache();
    return mapCollection(data);
  }

  const { data, error } = await supabase
    .from("collections")
    .update(payload)
    .eq("id", collection.id)
    .select("*")
    .single();

  if (error) throw new Error(error.message);
  invalidateCatalogCache();
  return mapCollection(data);
}

export async function deleteCollection(id: string) {
  if (catalogSource === "json") {
    throw new Error(
      "Supabase collections table is not available. Run the catalogue migration and set SUPABASE_SERVICE_ROLE_KEY.",
    );
  }

  const existing = await getCollectionById(id);
  if (!existing) throw new Error("Collection not found");

  const supabase = getSupabaseWriteClient();
  const { error } = await supabase.from("collections").delete().eq("id", id);
  if (error) throw new Error(error.message);
  invalidateCatalogCache();
}
