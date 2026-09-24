import "server-only";

import { randomUUID } from "crypto";

import type { Product, ProductVariant } from "@/lib/catalog-types";
import { DEFAULT_VARIANT_STOCK, makeVariantSku, type InventoryReason } from "@/lib/inventory";
import { getSupabaseReadClient, getSupabaseWriteClient } from "@/lib/supabase-catalog.server";
import type { SupabaseClient } from "@supabase/supabase-js";

export type InventoryVariant = ProductVariant & {
  productId: string;
};

function db(): SupabaseClient {
  return getSupabaseWriteClient() as unknown as SupabaseClient;
}

function readDb(): SupabaseClient {
  try {
    return getSupabaseReadClient() as unknown as SupabaseClient;
  } catch {
    return db();
  }
}

function withDb<T>(dbFn: () => Promise<T>): Promise<T> {
  return dbFn();
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
  return withDb(async () => {
    const { data, error } = await readDb()
      .from("product_variants")
      .select("*")
      .in("product_id", productIds);
    if (error) throw error;
    return (data ?? []).map((row) => mapVariant(row as Record<string, unknown>));
  });
}

export async function attachInventory(products: Product[]): Promise<Product[]> {
  if (!products.length) return products;
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

  return withDb(async () => {
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
  });
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
  return withDb<StockChangeResult>(async () => {
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
  });
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
