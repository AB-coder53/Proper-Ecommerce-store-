import type { Product } from "@/lib/catalog-types";

export function productVariantOptions(product: Product) {
  const colors = product.colors.map((color) => color.trim()).filter(Boolean);
  const sizes = product.sizes.map((size) => size.trim()).filter(Boolean);
  return {
    colors,
    sizes,
    requiresColor: colors.length > 0,
    requiresSize: sizes.length > 0,
    hasRequiredVariants: colors.length > 0 || sizes.length > 0,
    soleColor: colors.length === 1 ? colors[0] : undefined,
    soleSize: sizes.length === 1 ? sizes[0] : undefined,
  };
}

export function resolveDirectCartVariant(product: Product) {
  const options = productVariantOptions(product);
  if (options.hasRequiredVariants) return null;
  return {
    productId: product.id,
    color: options.soleColor ?? "Default",
    size: options.soleSize ?? "OS",
    quantity: 1 as const,
  };
}

export function isValidProductVariant(product: Product, color: string, size: string) {
  const options = productVariantOptions(product);
  const colorOk = options.requiresColor ? options.colors.includes(color) : true;
  const sizeOk = options.requiresSize ? options.sizes.includes(size) : true;
  return colorOk && sizeOk && Boolean(color) && Boolean(size);
}
