import { z } from "zod";

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
  badge: z.string().trim().max(40).optional().or(z.literal("")),
  featured: z.boolean().default(true),
  sortOrder: z.number().int().min(0).max(9999).default(0),
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
  tint: z.string().trim().min(1).max(80).default("bg-[#f5e9a8]"),
  sortOrder: z.number().int().min(0).max(9999).default(0),
});

export type Product = z.infer<typeof productSchema>;
export type Collection = z.infer<typeof collectionSchema>;

export type Catalog = {
  products: Product[];
  collections: Collection[];
};

export const SIZES = ["S", "M", "L", "XL", "XXL"];
export const SIZES_S_XL = ["S", "M", "L", "XL"];
