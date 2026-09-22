import { z } from "zod";

export const badgeToneSchema = z.enum(["default", "teal", "ink", "sale"]);

export const productBadgeSchema = z.object({
  id: z
    .string()
    .trim()
    .min(2)
    .max(40)
    .regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/, "Use lowercase slug ids like bestseller"),
  name: z.string().trim().min(1).max(40),
  label: z.string().trim().min(1).max(24),
  active: z.boolean().default(true),
  sortOrder: z.number().int().min(0).max(9999).default(0),
  tone: badgeToneSchema.default("default"),
  createdAt: z.string().optional(),
  updatedAt: z.string().optional(),
});

export type ProductBadge = z.infer<typeof productBadgeSchema>;

export const couponTypeSchema = z.enum(["percent", "fixed", "per_item_fixed"]);

export const couponSchema = z.object({
  id: z.string().uuid().optional(),
  code: z
    .string()
    .trim()
    .min(3)
    .max(40)
    .regex(/^[A-Za-z0-9_-]+$/, "Use letters, numbers, hyphens, or underscores"),
  name: z.string().trim().min(2).max(80),
  type: couponTypeSchema,
  value: z.number().int().min(1).max(1_000_000),
  active: z.boolean().default(true),
  startsAt: z.string().trim().max(40).optional().or(z.literal("")),
  endsAt: z.string().trim().max(40).optional().or(z.literal("")),
  minOrderValue: z.number().int().min(0).max(10_000_000).default(0),
  maxDiscount: z.number().int().min(0).max(10_000_000).optional().nullable(),
  usageLimit: z.number().int().min(0).max(1_000_000).optional().nullable(),
  usagePerCustomer: z.number().int().min(0).max(1000).optional().nullable(),
  productIds: z.array(z.string().trim().min(1).max(80)).max(40).default([]),
  currentUsage: z.number().int().min(0).optional(),
  createdAt: z.string().optional(),
  updatedAt: z.string().optional(),
});

export type Coupon = z.infer<typeof couponSchema>;

export type CouponStatus = "active" | "inactive" | "scheduled" | "expired" | "exhausted";

export type CouponQuote = {
  ok: boolean;
  code: string;
  discount: number;
  couponId?: string | undefined;
  error?: string | undefined;
  status?: CouponStatus | undefined;
};

export function couponStatus(
  coupon: Coupon,
  usage = coupon.currentUsage ?? 0,
  now = new Date(),
): CouponStatus {
  if (!coupon.active) return "inactive";
  if (coupon.usageLimit != null && coupon.usageLimit > 0 && usage >= coupon.usageLimit) {
    return "exhausted";
  }
  if (coupon.startsAt) {
    const start = Date.parse(coupon.startsAt);
    if (!Number.isNaN(start) && start > now.getTime()) return "scheduled";
  }
  if (coupon.endsAt) {
    const end = Date.parse(coupon.endsAt);
    if (!Number.isNaN(end) && end < now.getTime()) return "expired";
  }
  return "active";
}

export function computeCouponDiscount(
  coupon: Coupon,
  lines: { productId: string; unitPrice: number; quantity: number }[],
) {
  const eligible = coupon.productIds.length
    ? lines.filter((line) => coupon.productIds.includes(line.productId))
    : lines;
  const subtotal = eligible.reduce((sum, line) => sum + line.unitPrice * line.quantity, 0);
  const units = eligible.reduce((sum, line) => sum + line.quantity, 0);
  let amount = 0;
  if (coupon.type === "percent") {
    amount = Math.round((subtotal * coupon.value) / 100);
  } else if (coupon.type === "per_item_fixed") {
    amount = eligible.reduce(
      (sum, line) => sum + Math.min(coupon.value, line.unitPrice) * line.quantity,
      0,
    );
  } else {
    amount = Math.min(coupon.value, subtotal);
  }
  if (coupon.maxDiscount && coupon.maxDiscount > 0) {
    amount = Math.min(amount, coupon.maxDiscount);
  }
  return { amount: Math.max(0, amount), eligibleSubtotal: subtotal, units };
}

export function badgeToneClass(tone: ProductBadge["tone"] | undefined) {
  if (tone === "teal") return "bg-teal text-teal-foreground";
  if (tone === "ink") return "bg-ink text-ink-foreground";
  if (tone === "sale") return "bg-[#b45309] text-white";
  return "bg-white text-foreground";
}
