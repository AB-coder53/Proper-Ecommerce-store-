import { CART_MAX_QUANTITY } from "@/lib/commerce-constants";

export const DEFAULT_VARIANT_STOCK = 10;
export const LOW_STOCK_THRESHOLD = 5;

export type InventoryReason =
  | "ORDER_CONFIRMED"
  | "ORDER_CANCELLED"
  | "ORDER_REFUNDED"
  | "ORDER_RELEASED"
  | "ADMIN_ADJUSTMENT"
  | "STOCK_RESTOCK";

export const RELEASE_ORDER_STATUSES = new Set(["cancelled", "failed", "returned"]);

export function makeVariantSku(productId: string, color: string, size: string) {
  const slug = (value: string) =>
    value
      .trim()
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-+|-+$/g, "") || "x";
  return `${productId}--${slug(color)}--${slug(size)}`;
}

export function stockStatusLabel(stock: number) {
  if (stock <= 0) return "Out of Stock";
  if (stock === 1) return "Only 1 left";
  if (stock <= LOW_STOCK_THRESHOLD) return `Only ${stock} left`;
  return "In Stock";
}

export function findProductVariant<
  T extends {
    color: string;
    size: string;
    stock: number;
    id?: string | undefined;
    sku?: string | undefined;
  },
>(variants: T[] | undefined, color: string, size: string) {
  return variants?.find((row) => row.color === color && row.size === size) ?? null;
}

export function availableStock(
  product: { variants?: { color: string; size: string; stock: number }[] } | undefined,
  color: string,
  size: string,
  fallback = 0,
) {
  if (!product?.variants?.length) return fallback;
  return findProductVariant(product.variants, color, size)?.stock ?? 0;
}

export function variantHasStock(
  product: { variants?: { color: string; size: string; stock: number }[] } | undefined,
  color: string,
  size: string,
) {
  return availableStock(product, color, size) > 0;
}

export function productHasPurchasableStock(product: {
  variants?: { color: string; size: string; stock: number }[];
}) {
  const variants = product.variants ?? [];
  if (!variants.length) return true;
  return variants.some((row) => row.stock > 0);
}

export function quantityCap(stock: number) {
  return Math.max(0, Math.min(CART_MAX_QUANTITY, stock));
}

export function variantMatrix(product: {
  id?: string;
  colors: string[];
  sizes: string[];
  variants?: {
    id?: string | undefined;
    sku?: string | undefined;
    color: string;
    size: string;
    stock: number;
  }[];
}) {
  return product.colors.flatMap((color) =>
    product.sizes.map((size) => {
      const found = findProductVariant(product.variants, color, size);
      return {
        id: found?.id ?? "",
        sku: found?.sku ?? makeVariantSku(product.id || "product", color, size),
        color,
        size,
        stock: found?.stock ?? DEFAULT_VARIANT_STOCK,
      };
    }),
  );
}

export function stockShortageMessage(input: {
  name: string;
  color: string;
  size: string;
  requested: number;
  stock: number;
}) {
  if (input.stock <= 0) {
    return `This product/variant is currently out of stock. ${input.name} (${input.color}, size ${input.size}).`;
  }
  if (input.requested > input.stock) {
    return `Only ${input.stock} units of ${input.name} (${input.color}, size ${input.size}) are currently available.`;
  }
  return "This item is no longer available in the requested quantity. Please update your cart.";
}
