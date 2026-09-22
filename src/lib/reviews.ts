import { z } from "zod";

export const REVIEW_STATUSES = ["pending", "approved", "rejected"] as const;
export const REVIEW_MIN_LENGTH = 20;
export const REVIEW_MAX_LENGTH = 1000;
export const REVIEW_PAGE_SIZE = 5;

export const reviewStatusSchema = z.enum(REVIEW_STATUSES);

export const reviewInputSchema = z.object({
  rating: z.number().int().min(1).max(5),
  body: z
    .string()
    .trim()
    .min(REVIEW_MIN_LENGTH, `Write at least ${REVIEW_MIN_LENGTH} characters.`)
    .max(REVIEW_MAX_LENGTH),
  orderId: z.string().uuid().optional(),
});

export type ReviewInput = z.infer<typeof reviewInputSchema>;
export type ReviewStatus = z.infer<typeof reviewStatusSchema>;

export type PublicReview = {
  id: string;
  productId: string;
  rating: number;
  body: string;
  displayName: string;
  verifiedPurchase: boolean;
  color: string | null;
  size: string | null;
  createdAt: string;
};

export type AdminReview = PublicReview & {
  customerId: string;
  customerEmail: string;
  customerName: string;
  orderId: string;
  orderNumber: string;
  variantId: string | null;
  status: ReviewStatus;
  updatedAt: string;
};

export type ReviewSummary = {
  average: number;
  count: number;
  distribution: { rating: number; count: number }[];
};

export type ReviewEligibility = {
  authenticated: boolean;
  canReview: boolean;
  reason: string;
  orderId?: string;
  color?: string;
  size?: string;
};

export function sanitizeReviewText(value: string) {
  return value
    .replace(/<[^>]*>/g, " ")
    .replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F]/g, "")
    .replace(/\s+/g, " ")
    .trim();
}

export function publicReviewerName(fullName: string) {
  const parts = fullName.trim().split(/\s+/).filter(Boolean);
  if (!parts.length) return "Customer";
  if (parts.length === 1) return parts[0] ?? "Customer";
  const last = parts[1]?.[0];
  return last ? `${parts[0]} ${last}.` : (parts[0] ?? "Customer");
}

export function averageRating(ratings: number[]) {
  if (!ratings.length) return 0;
  const sum = ratings.reduce((total, value) => total + value, 0);
  return Math.round((sum / ratings.length) * 10) / 10;
}

export function ratingDistribution(ratings: number[]) {
  return [5, 4, 3, 2, 1].map((rating) => ({
    rating,
    count: ratings.filter((value) => value === rating).length,
  }));
}
