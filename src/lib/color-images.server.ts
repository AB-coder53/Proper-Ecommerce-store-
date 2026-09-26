import "server-only";

import type { Product, ProductColorImages } from "@/lib/catalog-types";
import { PRODUCT_IMAGES_BUCKET } from "@/lib/media";
import { parseColorImages, resolveColorImages } from "@/lib/product-colors";
import { getSupabaseWriteClient } from "@/lib/supabase-catalog.server";

function colorImagesPath(productId: string) {
  return `meta/color-images/${productId}.json`;
}

export async function readStoredColorImages(productId: string): Promise<ProductColorImages[]> {
  try {
    const { data, error } = await getSupabaseWriteClient()
      .storage.from(PRODUCT_IMAGES_BUCKET)
      .download(colorImagesPath(productId));
    if (error || !data) return [];
    return parseColorImages(JSON.parse(await data.text()));
  } catch {
    return [];
  }
}

export async function writeStoredColorImages(productId: string, colorImages: ProductColorImages[]) {
  const { error } = await getSupabaseWriteClient()
    .storage.from(PRODUCT_IMAGES_BUCKET)
    .upload(
      colorImagesPath(productId),
      new Blob([JSON.stringify(colorImages)], { type: "application/json" }),
      {
        contentType: "application/json",
        upsert: true,
      },
    );
  if (error) throw new Error(error.message);
}

export async function attachStoredColorImages(products: Product[]): Promise<Product[]> {
  if (!products.length) return products;
  const extras = await Promise.all(
    products.map(async (product) => {
      if (product.colorImages?.some((entry) => entry.images.length)) {
        return product.colorImages;
      }
      const stored = await readStoredColorImages(product.id);
      return resolveColorImages(product.colors, product.images, stored);
    }),
  );
  return products.map((product, index) => ({
    ...product,
    colorImages: extras[index] ?? product.colorImages ?? [],
  }));
}
