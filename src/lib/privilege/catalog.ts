import type { Product } from "@/lib/catalog-types";
import { applyIstefadaDiscount } from "@/lib/istefada-offer";
import type { PrivilegeProduct } from "@/lib/privilege/types";
import { parsePriceInr } from "@/lib/seo";

function productImages(product: Product) {
  return product.images.length > 0 ? product.images : [product.image];
}

function imageForColor(product: Product, color: string) {
  const images = productImages(product);
  const orderIndex = product.colors.indexOf(color);
  const slot = orderIndex >= 0 ? images[orderIndex]?.trim() : "";
  if (slot) return slot;
  return images.find((src) => src.trim()) || product.image;
}

export function mapCatalogProductToPrivilege(product: Product): PrivilegeProduct | null {
  const originalPrice = parsePriceInr(product.price);
  if (originalPrice == null) return null;

  const defaultColor = product.colors[0] ?? "Default";
  const discountedPrice = applyIstefadaDiscount(originalPrice);
  const sizes = product.sizes.length > 0 ? product.sizes : ["M"];
  const defaultSize = sizes.includes("L") ? "L" : (sizes[0] ?? "M");

  const badge = product.badge?.trim();

  return {
    id: product.id,
    catalogId: product.id,
    name: product.name,
    variant: defaultColor,
    colors: product.colors,
    images: productImages(product),
    price: discountedPrice,
    originalPrice,
    gsm: product.fabric.toUpperCase(),
    tag: badge || "IN STOCK",
    ...(badge ? { badge } : {}),
    image: imageForColor(product, defaultColor),
    sizes,
    defaultSize,
    defaultColor,
  };
}

export function mapCatalogToPrivilegeProducts(products: Product[]) {
  return products
    .slice()
    .sort((a, b) => a.sortOrder - b.sortOrder)
    .map(mapCatalogProductToPrivilege)
    .filter((product): product is PrivilegeProduct => product != null);
}

export function privilegeImageForColor(product: PrivilegeProduct, color: string) {
  const orderIndex = product.colors.indexOf(color);
  const slot = orderIndex >= 0 ? product.images[orderIndex]?.trim() : "";
  if (slot) return slot;
  return product.images.find((src) => src.trim()) || product.image;
}
