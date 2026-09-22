import "server-only";

import { randomUUID } from "crypto";
import { promises as fs } from "fs";
import path from "path";

import type { Product, ProductVariant } from "@/lib/catalog-types";
import { DEFAULT_VARIANT_STOCK, makeVariantSku, type InventoryReason } from "@/lib/inventory";
import { getSupabaseWriteClient } from "@/lib/supabase-catalog.server";
import { isMissingTableError } from "@/lib/store-config.shared";
import type { SupabaseClient } from "@supabase/supabase-js";

export type InventoryVariant = ProductVariant & {
  productId: string;
};

type InventoryTxn = {
  id: string;
  variantId: string;
  productId: string;
  sku: string;
  color: string;
  size: string;
  delta: number;
  previousStock: number;
  newStock: number;
  reason: InventoryReason;
  orderId: string | null;
  orderNumber: string | null;
  createdAt: string;
};

type FileStore = {
  variants: InventoryVariant[];
  transactions: InventoryTxn[];
};

const DATA_PATH = path.join(process.cwd(), "data", "inventory.json");
let useFileStore: boolean | null = null;
let fileQueue: Promise<unknown> = Promise.resolve();

function db(): SupabaseClient {
  return getSupabaseWriteClient() as unknown as SupabaseClient;
}

function emptyStore(): FileStore {
  return { variants: [], transactions: [] };
}

async function readFileStore(): Promise<FileStore> {
  try {
    const raw = await fs.readFile(DATA_PATH, "utf8");
    return { ...emptyStore(), ...(JSON.parse(raw) as Partial<FileStore>) };
  } catch {
    return emptyStore();
  }
}

async function writeFileStore(store: FileStore) {
  await fs.mkdir(path.dirname(DATA_PATH), { recursive: true });
  await fs.writeFile(DATA_PATH, `${JSON.stringify(store, null, 2)}\n`, "utf8");
}

function withFileLock<T>(fn: () => Promise<T>): Promise<T> {
  const run = fileQueue.then(fn, fn);
  fileQueue = run.then(
    () => undefined,
    () => undefined,
  );
  return run;
}

function canFallback(error: unknown) {
  const err = error as { code?: string; message?: string };
  return (
    isMissingTableError(error) ||
    err.code === "PGRST202" ||
    /apply_variant_stock_change|product_variants|inventory_transactions/i.test(err.message ?? "") ||
    /SUPABASE_SERVICE_ROLE_KEY|Missing Supabase/i.test(err.message ?? "")
  );
}

async function withDbOrFile<T>(dbFn: () => Promise<T>, fileFn: () => Promise<T>): Promise<T> {
  if (useFileStore === true) return fileFn();
  try {
    const result = await dbFn();
    useFileStore = false;
    return result;
  } catch (error) {
    const err = error as { status?: number };
    if (err.status === 400 || err.status === 401 || err.status === 404 || err.status === 409) {
      throw error;
    }
    if (useFileStore === false && !canFallback(error)) throw error;
    if (canFallback(error)) {
      useFileStore = true;
      return fileFn();
    }
    throw error;
  }
}

function mapVariant(row: Record<string, unknown>): InventoryVariant {
  return {
    id: String(row["id"]),
    productId: String(row["product_id"] ?? row["productId"]),
    color: String(row["color"]),
    size: String(row["size"]),
    sku: String(row["sku"]),
    stock: Number(row["stock"] ?? 0),
  };
}

export async function listVariantsForProducts(productIds: string[]): Promise<InventoryVariant[]> {
  if (!productIds.length) return [];
  return withDbOrFile(
    async () => {
      const { data, error } = await db()
        .from("product_variants")
        .select("*")
        .in("product_id", productIds);
      if (error) throw error;
      return (data ?? []).map((row) => mapVariant(row as Record<string, unknown>));
    },
    async () => {
      const store = await readFileStore();
      const ids = new Set(productIds);
      return store.variants.filter((row) => ids.has(row.productId));
    },
  );
}

async function seedMissingVariants(products: Product[]) {
  if (!products.length) return;
  const existing = await listVariantsForProducts(products.map((row) => row.id));
  const have = new Set(existing.map((row) => `${row.productId}__${row.color}__${row.size}`));
  const missing: InventoryVariant[] = [];
  for (const product of products) {
    for (const color of product.colors.map((row) => row.trim()).filter(Boolean)) {
      for (const size of product.sizes.map((row) => row.trim()).filter(Boolean)) {
        const key = `${product.id}__${color}__${size}`;
        if (have.has(key)) continue;
        missing.push({
          id: randomUUID(),
          productId: product.id,
          color,
          size,
          sku: makeVariantSku(product.id, color, size),
          stock: DEFAULT_VARIANT_STOCK,
        });
      }
    }
  }
  if (!missing.length) return;

  await withDbOrFile(
    async () => {
      const { error } = await db()
        .from("product_variants")
        .upsert(
          missing.map((row) => ({
            id: row.id,
            product_id: row.productId,
            color: row.color,
            size: row.size,
            sku: row.sku,
            stock: row.stock,
          })),
          { onConflict: "product_id,color,size", ignoreDuplicates: true },
        );
      if (error) throw error;
    },
    async () =>
      withFileLock(async () => {
        const store = await readFileStore();
        const keys = new Set(
          store.variants.map((row) => `${row.productId}__${row.color}__${row.size}`),
        );
        for (const row of missing) {
          const key = `${row.productId}__${row.color}__${row.size}`;
          if (keys.has(key)) continue;
          store.variants.push(row);
          keys.add(key);
        }
        await writeFileStore(store);
      }),
  );
}

export async function attachInventory(products: Product[]): Promise<Product[]> {
  if (!products.length) return products;
  await seedMissingVariants(products);
  const variants = await listVariantsForProducts(products.map((row) => row.id));
  const byProduct = new Map<string, ProductVariant[]>();
  for (const variant of variants) {
    const list = byProduct.get(variant.productId) ?? [];
    list.push({
      id: variant.id,
      sku: variant.sku,
      color: variant.color,
      size: variant.size,
      stock: variant.stock,
    });
    byProduct.set(variant.productId, list);
  }
  return products.map((product) => ({
    ...product,
    variants: (byProduct.get(product.id) ?? product.variants ?? []).filter(
      (row) => product.colors.includes(row.color) && product.sizes.includes(row.size),
    ),
  }));
}

export async function getVariant(productId: string, color: string, size: string) {
  const variants = await listVariantsForProducts([productId]);
  return variants.find((row) => row.color === color && row.size === size) ?? null;
}

export async function syncProductVariants(product: Product) {
  const colors = product.colors.map((row) => row.trim()).filter(Boolean);
  const sizes = product.sizes.map((row) => row.trim()).filter(Boolean);
  const wanted = colors.flatMap((color) =>
    sizes.map((size) => ({
      color,
      size,
      sku: makeVariantSku(product.id, color, size),
      stock:
        product.variants?.find((row) => row.color === color && row.size === size)?.stock ??
        DEFAULT_VARIANT_STOCK,
    })),
  );

  return withDbOrFile(
    async () => {
      const sb = db();
      const { data: existing, error } = await sb
        .from("product_variants")
        .select("*")
        .eq("product_id", product.id);
      if (error) throw error;
      const current = (existing ?? []).map((row) => mapVariant(row as Record<string, unknown>));
      const keep = new Set(wanted.map((row) => `${row.color}__${row.size}`));

      for (const next of wanted) {
        const found = current.find((row) => row.color === next.color && row.size === next.size);
        if (found) {
          if (found.stock === next.stock) continue;
          const result = await applyStockChange({
            variantId: found.id,
            delta: next.stock - found.stock,
            reason: next.stock > found.stock ? "STOCK_RESTOCK" : "ADMIN_ADJUSTMENT",
          });
          if (!result.ok) {
            throw Object.assign(new Error(result.error ?? "Could not update stock."), {
              status: 400,
            });
          }
        } else {
          const { error: insertError } = await sb.from("product_variants").insert({
            id: randomUUID(),
            product_id: product.id,
            color: next.color,
            size: next.size,
            sku: next.sku,
            stock: next.stock,
          });
          if (insertError) throw insertError;
        }
      }

      for (const row of current) {
        if (keep.has(`${row.color}__${row.size}`)) continue;
        if (row.stock !== 0) {
          const { error: zeroError } = await sb
            .from("product_variants")
            .update({ stock: 0, updated_at: new Date().toISOString() })
            .eq("id", row.id);
          if (zeroError) throw zeroError;
        }
      }
    },
    async () =>
      withFileLock(async () => {
        const store = await readFileStore();
        const keep = new Set(wanted.map((row) => `${row.color}__${row.size}`));
        for (const next of wanted) {
          const found = store.variants.find(
            (row) =>
              row.productId === product.id && row.color === next.color && row.size === next.size,
          );
          if (found) {
            found.stock = next.stock;
          } else {
            store.variants.push({
              id: randomUUID(),
              productId: product.id,
              color: next.color,
              size: next.size,
              sku: next.sku,
              stock: next.stock,
            });
          }
        }
        for (const row of store.variants) {
          if (row.productId !== product.id) continue;
          if (!keep.has(`${row.color}__${row.size}`)) row.stock = 0;
        }
        await writeFileStore(store);
      }),
  );
}

export type StockChangeResult = {
  ok: boolean;
  stock: number;
  idempotent?: boolean | undefined;
  error?: string | undefined;
};

export async function applyStockChange(input: {
  variantId: string;
  delta: number;
  reason: InventoryReason;
  orderId?: string | null;
  orderNumber?: string | null;
}): Promise<StockChangeResult> {
  return withDbOrFile<StockChangeResult>(
    async () => {
      const { data, error } = await db().rpc("apply_variant_stock_change", {
        p_variant_id: input.variantId,
        p_delta: input.delta,
        p_reason: input.reason,
        p_order_id: input.orderId ?? null,
        p_order_number: input.orderNumber ?? null,
      });
      if (error) throw error;
      const payload = (data ?? {}) as {
        ok?: boolean;
        stock?: number;
        idempotent?: boolean;
        error?: string;
      };
      return {
        ok: Boolean(payload.ok),
        stock: Number(payload.stock ?? 0),
        idempotent: Boolean(payload.idempotent),
        ...(payload.error ? { error: payload.error } : {}),
      };
    },
    async () =>
      withFileLock(async () => {
        const store = await readFileStore();
        if (input.orderId) {
          const existing = store.transactions.find(
            (row) =>
              row.orderId === input.orderId &&
              row.reason === input.reason &&
              row.variantId === input.variantId,
          );
          if (existing) {
            const current = store.variants.find((row) => row.id === input.variantId);
            return { ok: true, stock: current?.stock ?? existing.newStock, idempotent: true };
          }
        }
        const variant = store.variants.find((row) => row.id === input.variantId);
        if (!variant) return { ok: false, stock: 0, error: "variant_not_found" };
        const previous = variant.stock;
        const next = previous + input.delta;
        if (next < 0) return { ok: false, stock: previous, error: "insufficient_stock" };
        variant.stock = next;
        store.transactions.push({
          id: randomUUID(),
          variantId: variant.id,
          productId: variant.productId,
          sku: variant.sku,
          color: variant.color,
          size: variant.size,
          delta: input.delta,
          previousStock: previous,
          newStock: next,
          reason: input.reason,
          orderId: input.orderId ?? null,
          orderNumber: input.orderNumber ?? null,
          createdAt: new Date().toISOString(),
        });
        await writeFileStore(store);
        return { ok: true, stock: next, idempotent: false };
      }),
  );
}

export async function deductOrderInventory(
  orderId: string,
  orderNumber: string,
  lines: {
    productId: string;
    color: string;
    size: string;
    quantity: number;
    productName: string;
  }[],
) {
  const deducted: { variant: InventoryVariant; quantity: number }[] = [];
  try {
    for (const line of lines) {
      const variant = await getVariant(line.productId, line.color, line.size);
      if (!variant) {
        throw Object.assign(
          new Error(
            `This product/variant is currently out of stock. ${line.productName} (${line.color}, size ${line.size}).`,
          ),
          { status: 409 },
        );
      }
      const result = await applyStockChange({
        variantId: variant.id,
        delta: -line.quantity,
        reason: "ORDER_CONFIRMED",
        orderId,
        orderNumber,
      });
      if (!result.ok) {
        const available = result.stock;
        const message =
          available <= 0
            ? `This product/variant is currently out of stock. ${line.productName} (${line.color}, size ${line.size}).`
            : available < line.quantity
              ? `Only ${available} units of ${line.productName} (${line.color}, size ${line.size}) are currently available.`
              : "This item is no longer available in the requested quantity. Please update your cart.";
        throw Object.assign(new Error(message), { status: 409, available });
      }
      deducted.push({ variant, quantity: line.quantity });
    }
    return deducted;
  } catch (error) {
    for (const row of deducted) {
      await applyStockChange({
        variantId: row.variant.id,
        delta: row.quantity,
        reason: "ORDER_RELEASED",
        orderId,
        orderNumber,
      }).catch(() => undefined);
    }
    throw error;
  }
}

export async function restoreOrderInventory(
  orderId: string,
  orderNumber: string,
  lines: { productId: string; color: string; size: string; quantity: number }[],
  reason: Extract<InventoryReason, "ORDER_CANCELLED" | "ORDER_REFUNDED" | "ORDER_RELEASED">,
) {
  for (const line of lines) {
    const variant = await getVariant(line.productId, line.color, line.size);
    if (!variant) continue;
    await applyStockChange({
      variantId: variant.id,
      delta: line.quantity,
      reason,
      orderId,
      orderNumber,
    });
  }
}
