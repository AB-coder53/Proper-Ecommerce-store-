import { z } from "zod";

import type { ProductBadge } from "@/lib/promotions";
import { variantMatrix } from "@/lib/inventory";

export const productSchema = z.object({
  id: z
    .string()
    .trim()
    .min(2)
    .max(80)
    .regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/, "Use lowercase slug ids like oversized-240"),
  name: z.string().trim().min(2).max(120),
  fabric: z.string().trim().min(2).max(120),
  image: z.string().trim().min(1).max(500),
  images: z.array(z.string().trim().min(1).max(500)).max(12).default([]),
  tagline: z.string().trim().min(2).max(200),
  description: z.string().trim().min(10).max(2000),
  details: z.array(z.string().trim().min(1).max(200)).max(20).default([]),
  colors: z.array(z.string().trim().min(1).max(40)).min(1).max(20),
  sizes: z.array(z.string().trim().min(1).max(10)).min(1).max(20),
  price: z.string().trim().min(1).max(40),
  compareAtPrice: z.string().trim().max(40).optional().or(z.literal("")),
  badge: z.string().trim().max(40).optional().or(z.literal("")),
  badgeIds: z.array(z.string().trim().min(1).max(40)).max(12).optional().default([]),
  sizeChart: z.string().trim().max(500).optional().or(z.literal("")),
  featured: z.boolean().default(true),
  sortOrder: z.number().int().min(0).max(9999).default(0),
  variants: z
    .array(
      z.object({
        id: z.string().optional(),
        sku: z.string().optional(),
        color: z.string().trim().min(1).max(40),
        size: z.string().trim().min(1).max(10),
        stock: z.number().int().min(0).max(99999),
      }),
    )
    .optional()
    .default([]),
});

export const collectionSchema = z.object({
  id: z
    .string()
    .trim()
    .min(2)
    .max(80)
    .regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/, "Use lowercase slug ids"),
  title: z.string().trim().min(2).max(80),
  image: z.string().trim().min(1).max(500),
  productId: z.string().trim().max(80).optional().or(z.literal("")),
  tint: z.string().trim().min(1).max(80).default("bg-white"),
  sortOrder: z.number().int().min(0).max(9999).default(0),
});

export type ProductVariant = {
  id: string;
  sku: string;
  color: string;
  size: string;
  stock: number;
};

export type Product = Omit<z.infer<typeof productSchema>, "variants"> & {
  variants: ProductVariant[];
  badges?: ProductBadge[];
};
export type Collection = z.infer<typeof collectionSchema>;

export type Catalog = {
  products: Product[];
  collections: Collection[];
};

export const SIZES = ["S", "M", "L", "XL", "XXL"];
export const SIZES_S_XL = ["S", "M", "L", "XL"];

export function asProduct(input: z.infer<typeof productSchema>): Product {
  return {
    ...input,
    variants: variantMatrix(input),
  };
}
