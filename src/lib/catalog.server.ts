import "server-only";

import { cache } from "react";
import { revalidatePath, revalidateTag, unstable_cache } from "next/cache";

import type { Database } from "@/integrations/supabase/types";
import type { Catalog, Collection, Product } from "@/lib/catalog-types";
import { attachInventory, syncProductVariants } from "@/lib/inventory.server";
import { parsePriceInr } from "@/lib/price";
import { attachStoredColorImages, writeStoredColorImages } from "@/lib/color-images.server";
import { resolveMediaUrl, resolveMediaUrls } from "@/lib/media";
import { parseColorImages, resolveColorImages } from "@/lib/product-colors";
import { attachProductBadges, setProductBadges } from "@/lib/promotions.server";
import { getSupabaseReadClient, getSupabaseWriteClient } from "@/lib/supabase-catalog.server";

type ProductRow = Database["public"]["Tables"]["products"]["Row"];
type CollectionRow = Database["public"]["Tables"]["collections"]["Row"];
type ProductInsert = Database["public"]["Tables"]["products"]["Insert"];
type CollectionInsert = Database["public"]["Tables"]["collections"]["Insert"];

const CATALOG_CACHE_TAG = "catalog";

export function invalidateCatalogCache() {
  revalidateTag(CATALOG_CACHE_TAG);
  revalidatePath("/", "layout");
  revalidatePath("/collection");
}

function mapProduct(row: ProductRow): Product {
  const extra = row as ProductRow & { compare_at_price?: string | null; color_images?: unknown };
  return {
    id: row.id,
    name: row.name,
    fabric: row.fabric,
    image: resolveMediaUrl(row.image),
    images: resolveMediaUrls(row.images),
    colorImages: parseColorImages(extra.color_images ?? row.color_images).map((entry) => ({
      ...entry,
      images: resolveMediaUrls(entry.images),
    })),
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
    image: resolveMediaUrl(row.image),
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
    color_images: product.colorImages ?? [],
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
    products: await attachStoredColorImages((productsRes.data ?? []).map(mapProduct)),
    collections: (collectionsRes.data ?? []).map(mapCollection),
  };
  return {
    ...catalog,
    products: await attachProductBadges(await attachInventory(catalog.products)),
  };
}

async function resolveCatalog(): Promise<Catalog> {
  return readSupabaseCatalog();
}

const loadCatalogCached = unstable_cache(resolveCatalog, ["catalog"], {
  revalidate: 60,
  tags: [CATALOG_CACHE_TAG],
});

/** Dedupes catalog reads within a single request (layout + page). */
export const getCatalog = cache(loadCatalogCached);

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
  const existing = await getProductById(product.id);
  if (mode === "create" && existing) throw new Error("A product with this id already exists");
  if (mode === "update" && !existing) throw new Error("Product not found");

  const selling = parsePriceInr(product.price);
  const compareAt = parsePriceInr(product.compareAtPrice);
  if (compareAt > 0 && selling > 0 && selling > compareAt) {
    throw new Error("Selling price cannot be higher than the compare-at price.");
  }

  const supabase = getSupabaseWriteClient();
  const persist = async (body: Record<string, unknown>) => {
    if (mode === "create") {
      return supabase
        .from("products")
        .insert(body as ProductInsert)
        .select("*")
        .single();
    }
    return supabase
      .from("products")
      .update(body as ProductInsert)
      .eq("id", product.id)
      .select("*")
      .single();
  };

  const body: Record<string, unknown> = { ...toProductInsert(product) };
  let { data, error } = await persist(body);
  while (error) {
    const missing =
      error.message.match(/Could not find the '([^']+)' column/i)?.[1] ??
      error.message.match(/column .*[.](\w+) does not exist/i)?.[1];
    if (!missing || !(missing in body)) break;
    delete body[missing];
    ({ data, error } = await persist(body));
  }
  if (error || !data) throw new Error(error?.message ?? "Could not save product");
  const mapped = mapProduct(data);
  const colorImages = resolveColorImages(
    product.colors,
    product.images,
    product.colorImages ?? mapped.colorImages,
  );
  await writeStoredColorImages(mapped.id, colorImages);
  await syncProductVariants({ ...product, id: mapped.id });
  await setProductBadges(mapped.id, product.badgeIds ?? []);
  invalidateCatalogCache();
  revalidatePath(`/collection/${product.id}`);
  const withStock = await attachProductBadges(await attachInventory([{ ...mapped, colorImages }]));
  return withStock[0] ?? { ...mapped, colorImages };
}

export async function deleteProduct(id: string) {
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
  const existing = await getCollectionById(id);
  if (!existing) throw new Error("Collection not found");

  const supabase = getSupabaseWriteClient();
  const { error } = await supabase.from("collections").delete().eq("id", id);
  if (error) throw new Error(error.message);
  invalidateCatalogCache();
}
