import type { Product } from "@/lib/catalog-types";
import { productImageForColor } from "@/lib/cart-display";
import { applyIstefadaDiscount } from "@/lib/istefada-offer";
import type { PrivilegeProduct } from "@/lib/privilege/types";
import { colorToImageIndex } from "@/lib/product-colors";
import { parsePriceInr } from "@/lib/seo";

function productImages(product: Product) {
  return product.images.length > 0 ? product.images : [product.image];
}

function imageForColor(product: Product, color: string) {
  return productImageForColor(product, color);
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
    colorImages: product.colorImages,
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
  const src =
    product.images[colorToImageIndex(color, product.colors, product.images, product.colorImages)] ??
    "";
  return src.trim() || product.image;
}
