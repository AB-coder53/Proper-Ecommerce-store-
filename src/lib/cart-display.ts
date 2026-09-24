import type { Product } from "@/lib/catalog-types";
import { availableStock } from "@/lib/inventory";
import { CART_MAX_QUANTITY } from "@/lib/commerce-constants";
import type { CartItemInput, CartLine } from "@/lib/commerce-types";
import { parsePriceInr } from "@/lib/price";
import { colorToImageIndex } from "@/lib/product-colors";
import { istefadaUnitOff } from "@/lib/istefada-offer";
import type { BundleOfferView } from "@/lib/store-offers";

export type DisplayCartLine = {
  key: string;
  productId: string;
  name: string;
  image: string;
  size: string;
  color: string;
  quantity: number;
  unitPrice: number;
  lineTotal: number;
  product?: Product | undefined;
};

export type CartIssue = {
  key: string;
  productId: string;
  name: string;
  size: string;
  color: string;
  type: "unavailable" | "variant" | "price" | "quantity";
  message: string;
};

export function guestLineKey(item: { productId: string; size: string; color: string }) {
  return `${item.productId}__${item.size}__${item.color}`;
}

export function productImageForColor(product: Product, color: string) {
  const images = product.images?.length ? product.images : [product.image];
  const src = images[colorToImageIndex(color, product.colors, images, product.colorImages)] ?? "";
  return src.trim() ? src : product.image;
}

export function displayLineFromInput(item: CartItemInput, products: Product[]): DisplayCartLine {
  const product = products.find((row) => row.id === item.productId);
  const unitPrice = parsePriceInr(product?.price);
  return {
    key: guestLineKey(item),
    productId: item.productId,
    name: product?.name ?? item.productId,
    image: product ? productImageForColor(product, item.color) : "",
    size: item.size,
    color: item.color,
    quantity: item.quantity,
    unitPrice,
    lineTotal: unitPrice * item.quantity,
    product,
  };
}

export function buildDisplayCartLines({
  customer,
  cart,
  guestCart,
  products,
}: {
  customer: boolean;
  cart: CartLine[];
  guestCart: CartItemInput[];
  products: Product[];
}): DisplayCartLine[] {
  if (customer) {
    return cart.map((line) => {
      const product = products.find((row) => row.id === line.productId);
      return {
        key: line.id,
        productId: line.productId,
        name: line.productName,
        image: product ? productImageForColor(product, line.color) : line.productImage,
        size: line.size,
        color: line.color,
        quantity: line.quantity,
        unitPrice: line.unitPrice,
        lineTotal: line.lineTotal,
        product,
      };
    });
  }

  return guestCart.map((item) => {
    const product = products.find((row) => row.id === item.productId);
    const unitPrice = parsePriceInr(product?.price);
    return {
      key: guestLineKey(item),
      productId: item.productId,
      name: product?.name ?? item.productId,
      image: product ? productImageForColor(product, item.color) : "",
      size: item.size,
      color: item.color,
      quantity: item.quantity,
      unitPrice,
      lineTotal: unitPrice * item.quantity,
      product,
    };
  });
}

export function linePricing(line: DisplayCartLine, hasOffer: boolean) {
  const unitOff = hasOffer ? istefadaUnitOff(line.unitPrice) : 0;
  const discountedUnit = line.unitPrice - unitOff;
  return {
    unitOff,
    discountedUnit,
    originalLine: line.unitPrice * line.quantity,
    discountedLine: discountedUnit * line.quantity,
    savings: unitOff * line.quantity,
  };
}

export function qualifyingBundles(bundles: BundleOfferView[], productIds: string[]) {
  const ids = new Set(productIds);
  return bundles.filter((bundle) => bundle.items.every((item) => ids.has(item.id)));
}

export function validateDisplayCartLines(
  lines: DisplayCartLine[],
  products: Product[],
): CartIssue[] {
  const issues: CartIssue[] = [];
  for (const line of lines) {
    const product = products.find((row) => row.id === line.productId);
    if (!product) {
      issues.push({
        key: line.key,
        productId: line.productId,
        name: line.name,
        size: line.size,
        color: line.color,
        type: "unavailable",
        message: `${line.name} is no longer available.`,
      });
      continue;
    }
    if (!product.colors.includes(line.color) || !product.sizes.includes(line.size)) {
      issues.push({
        key: line.key,
        productId: line.productId,
        name: line.name,
        size: line.size,
        color: line.color,
        type: "variant",
        message: `${line.name} (${line.color}, size ${line.size}) is currently out of stock.`,
      });
      continue;
    }
    const stock = availableStock(product, line.color, line.size, CART_MAX_QUANTITY);
    if (stock <= 0) {
      issues.push({
        key: line.key,
        productId: line.productId,
        name: line.name,
        size: line.size,
        color: line.color,
        type: "unavailable",
        message: `This product/variant is currently out of stock. ${line.name} (${line.color}, size ${line.size}).`,
      });
      continue;
    }
    if (line.quantity > stock) {
      issues.push({
        key: line.key,
        productId: line.productId,
        name: line.name,
        size: line.size,
        color: line.color,
        type: "quantity",
        message: `Only ${stock} units of ${line.name} (${line.color}, size ${line.size}) are currently available. Please reduce the quantity before continuing.`,
      });
    }
    const livePrice = parsePriceInr(product.price);
    if (livePrice > 0 && livePrice !== line.unitPrice) {
      issues.push({
        key: line.key,
        productId: line.productId,
        name: line.name,
        size: line.size,
        color: line.color,
        type: "price",
        message: `The price of ${line.name} has changed. Please review your cart before continuing.`,
      });
    }
  }
  return issues;
}

export function formatCartIssue(issue: CartIssue) {
  return `${issue.name} · ${issue.color} · Size ${issue.size}`;
}
