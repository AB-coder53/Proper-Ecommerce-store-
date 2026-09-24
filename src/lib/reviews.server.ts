import "server-only";

import { randomUUID } from "crypto";

import { getProductById } from "@/lib/catalog.server";
import { listOrdersForCustomer } from "@/lib/commerce.server";
import type { CustomerPublic, Order } from "@/lib/commerce-types";
import {
  REVIEW_PAGE_SIZE,
  averageRating,
  publicReviewerName,
  ratingDistribution,
  adminReviewInputSchema,
  reviewInputSchema,
  sanitizeReviewText,
  type AdminReview,
  type PublicReview,
  type ReviewEligibility,
  type ReviewStatus,
  type ReviewSummary,
} from "@/lib/reviews";
import { getSupabaseWriteClient } from "@/lib/supabase-catalog.server";
import type { SupabaseClient } from "@supabase/supabase-js";

const REVIEWABLE_STATUSES = new Set(["delivered"]);
const RATE_WINDOW_MS = 10 * 60 * 1000;
const RATE_LIMIT = 5;
const recentSubmissions = new Map<string, number[]>();

type StoredReview = {
  id: string;
  productId: string;
  customerId: string;
  customerName: string;
  customerEmail: string;
  orderId: string;
  orderNumber: string;
  variantId: string | null;
  color: string | null;
  size: string | null;
  rating: number;
  body: string;
  status: ReviewStatus;
  verifiedPurchase: boolean;
  deletedAt: string | null;
  createdAt: string;
  updatedAt: string;
};

function db(): SupabaseClient {
  return getSupabaseWriteClient() as unknown as SupabaseClient;
}

function withDb<T>(dbFn: () => Promise<T>): Promise<T> {
  return dbFn();
}

function fail(message: string, status: number): never {
  throw Object.assign(new Error(message), { status });
}

function enforceRateLimit(customerId: string) {
  const now = Date.now();
  const stamps = (recentSubmissions.get(customerId) ?? []).filter(
    (time) => now - time < RATE_WINDOW_MS,
  );
  if (stamps.length >= RATE_LIMIT) {
    fail("Please wait a few minutes before submitting another review.", 429);
  }
  stamps.push(now);
  recentSubmissions.set(customerId, stamps);
}

function mapRow(row: Record<string, unknown>): StoredReview {
  return {
    id: String(row["id"]),
    productId: String(row["product_id"] ?? row["productId"]),
    customerId:
      row["customer_id"] == null && row["customerId"] == null
        ? ""
        : String(row["customer_id"] ?? row["customerId"] ?? ""),
    customerName: String(row["customer_name"] ?? row["customerName"] ?? "Customer"),
    customerEmail: String(row["customer_email"] ?? row["customerEmail"] ?? ""),
    orderId:
      row["order_id"] == null && row["orderId"] == null
        ? ""
        : String(row["order_id"] ?? row["orderId"] ?? ""),
    orderNumber: String(row["order_number"] ?? row["orderNumber"] ?? ""),
    variantId: (row["variant_id"] as string | null) ?? (row["variantId"] as string | null) ?? null,
    color: (row["color"] as string | null) ?? null,
    size: (row["size"] as string | null) ?? null,
    rating: Number(row["rating"]),
    body: String(row["body"] ?? ""),
    status: (row["status"] as ReviewStatus) ?? "pending",
    verifiedPurchase: Boolean(row["verified_purchase"] ?? row["verifiedPurchase"] ?? true),
    deletedAt: (row["deleted_at"] as string | null) ?? (row["deletedAt"] as string | null) ?? null,
    createdAt: String(row["created_at"] ?? row["createdAt"]),
    updatedAt: String(row["updated_at"] ?? row["updatedAt"]),
  };
}

function toPublic(review: StoredReview): PublicReview {
  return {
    id: review.id,
    productId: review.productId,
    rating: review.rating,
    body: review.body,
    displayName: review.verifiedPurchase
      ? publicReviewerName(review.customerName)
      : review.customerName,
    verifiedPurchase: review.verifiedPurchase,
    color: review.color,
    size: review.size,
    createdAt: review.createdAt,
  };
}

function toAdmin(review: StoredReview): AdminReview {
  return {
    ...toPublic(review),
    customerId: review.customerId,
    customerEmail: review.customerEmail,
    customerName: review.customerName,
    orderId: review.orderId,
    orderNumber: review.orderNumber,
    variantId: review.variantId,
    status: review.status,
    updatedAt: review.updatedAt,
  };
}

function eligibleOrderItem(orders: Order[], productId: string, existing: StoredReview[]) {
  const used = new Set(
    existing
      .filter((row) => row.productId === productId && !row.deletedAt)
      .map((row) => row.orderId),
  );
  for (const order of orders) {
    if (!REVIEWABLE_STATUSES.has(order.orderStatus)) continue;
    const item = order.items.find((row) => row.productId === productId);
    if (!item) continue;
    if (used.has(order.id)) continue;
    return { order, item };
  }
  return null;
}

async function listStored(): Promise<StoredReview[]> {
  return withDb(async () => {
    const { data, error } = await db()
      .from("product_reviews")
      .select("*")
      .order("created_at", { ascending: false });
    if (error) throw error;
    return (data ?? []).map((row) => mapRow(row as Record<string, unknown>));
  });
}

async function listStoredForProduct(productId: string): Promise<StoredReview[]> {
  return withDb(async () => {
    const { data, error } = await db()
      .from("product_reviews")
      .select("*")
      .eq("product_id", productId)
      .order("created_at", { ascending: false });
    if (error) throw error;
    return (data ?? []).map((row) => mapRow(row as Record<string, unknown>));
  });
}

export async function getReviewSummary(productId: string): Promise<ReviewSummary> {
  const ratings = await withDb(async () => {
    const { data, error } = await db()
      .from("product_reviews")
      .select("rating")
      .eq("product_id", productId)
      .eq("status", "approved")
      .is("deleted_at", null);
    if (error) throw error;
    return (data ?? []).map((row) => Number((row as { rating: number }).rating));
  });
  return {
    average: averageRating(ratings),
    count: ratings.length,
    distribution: ratingDistribution(ratings),
  };
}

export async function listPublicReviews(
  productId: string,
  page = 1,
  sort: "newest" | "highest" | "lowest" = "newest",
) {
  const reviews = (await listStoredForProduct(productId)).filter(
    (row) => row.status === "approved" && !row.deletedAt,
  );
  reviews.sort((a, b) => {
    if (sort === "highest") return b.rating - a.rating || b.createdAt.localeCompare(a.createdAt);
    if (sort === "lowest") return a.rating - b.rating || b.createdAt.localeCompare(a.createdAt);
    return b.createdAt.localeCompare(a.createdAt);
  });
  const start = Math.max(0, (page - 1) * REVIEW_PAGE_SIZE);
  return {
    summary: {
      average: averageRating(reviews.map((row) => row.rating)),
      count: reviews.length,
      distribution: ratingDistribution(reviews.map((row) => row.rating)),
    } satisfies ReviewSummary,
    reviews: reviews.slice(start, start + REVIEW_PAGE_SIZE).map(toPublic),
    page,
    pageSize: REVIEW_PAGE_SIZE,
    totalPages: Math.max(1, Math.ceil(reviews.length / REVIEW_PAGE_SIZE)),
  };
}

export async function getReviewEligibility(
  productId: string,
  customer: CustomerPublic | null,
): Promise<ReviewEligibility> {
  if (!customer) {
    return { authenticated: false, canReview: false, reason: "Please log in to submit a review." };
  }
  const [orders, existing] = await Promise.all([
    listOrdersForCustomer(customer.id),
    listStoredForProduct(productId),
  ]);
  const mine = existing.filter((row) => row.customerId === customer.id);
  const match = eligibleOrderItem(orders, productId, mine);
  if (!match) {
    const purchased = orders.some((order) =>
      order.items.some((item) => item.productId === productId),
    );
    return {
      authenticated: true,
      canReview: false,
      reason: purchased
        ? "You can review this product after a delivered order, and only once per purchase."
        : "Verified reviews are available after you purchase and receive this product.",
    };
  }
  return {
    authenticated: true,
    canReview: true,
    reason: "",
    orderId: match.order.id,
    color: match.item.color,
    size: match.item.size,
  };
}

export async function submitReview(productId: string, customer: CustomerPublic, input: unknown) {
  const parsed = reviewInputSchema.parse({
    ...(input as object),
    body: sanitizeReviewText(String((input as { body?: string }).body ?? "")),
  });
  const product = await getProductById(productId);
  if (!product) fail("Product not found.", 404);
  enforceRateLimit(customer.id);

  const [orders, existing] = await Promise.all([
    listOrdersForCustomer(customer.id),
    listStoredForProduct(productId),
  ]);
  const mine = existing.filter((row) => row.customerId === customer.id);
  const requested = parsed.orderId
    ? (orders.find((order) => order.id === parsed.orderId) ?? null)
    : null;
  if (parsed.orderId && (!requested || requested.customerId !== customer.id)) {
    fail("That order is not available for this review.", 403);
  }
  const match = requested
    ? REVIEWABLE_STATUSES.has(requested.orderStatus)
      ? {
          order: requested,
          item: requested.items.find((item) => item.productId === productId) ?? null,
        }
      : null
    : eligibleOrderItem(orders, productId, mine);
  if (!match?.item) fail("You can only review products from a delivered order.", 403);
  if (
    mine.some(
      (row) => row.productId === productId && row.orderId === match.order.id && !row.deletedAt,
    )
  ) {
    fail("You have already reviewed this product for that order.", 409);
  }

  const now = new Date().toISOString();
  const review: StoredReview = {
    id: randomUUID(),
    productId,
    customerId: customer.id,
    customerName: customer.fullName,
    customerEmail: customer.email,
    orderId: match.order.id,
    orderNumber: match.order.orderNumber,
    variantId: match.item.variantId ?? null,
    color: match.item.color,
    size: match.item.size,
    rating: parsed.rating,
    body: parsed.body,
    status: "pending",
    verifiedPurchase: true,
    deletedAt: null,
    createdAt: now,
    updatedAt: now,
  };

  await withDb(async () => {
    const { error } = await db().from("product_reviews").insert({
      id: review.id,
      product_id: review.productId,
      customer_id: review.customerId,
      order_id: review.orderId,
      variant_id: review.variantId,
      color: review.color,
      size: review.size,
      rating: review.rating,
      body: review.body,
      customer_name: review.customerName,
      customer_email: review.customerEmail,
      order_number: review.orderNumber,
      status: review.status,
      verified_purchase: true,
    });
    if (error && /duplicate|unique/i.test(error.message)) {
      fail("You have already reviewed this product for that order.", 409);
    }
    if (error) throw error;
  });

  return {
    id: review.id,
    status: review.status,
    message: "Thanks. Your review is pending approval.",
  };
}

export async function createAdminReview(input: unknown) {
  const parsed = adminReviewInputSchema.parse({
    ...(input as object),
    body: sanitizeReviewText(String((input as { body?: string }).body ?? "")),
  });
  const product = await getProductById(parsed.productId);
  if (!product) fail("Product not found.", 404);
  const color = parsed.color?.trim() || null;
  const size = parsed.size?.trim() || null;
  if (color && !product.colors.includes(color)) fail("That colour is not on this product.", 400);
  if (size && !product.sizes.includes(size)) fail("That size is not on this product.", 400);

  const now = new Date().toISOString();
  const review: StoredReview = {
    id: randomUUID(),
    productId: product.id,
    customerId: "",
    customerName: parsed.reviewerName,
    customerEmail: "",
    orderId: "",
    orderNumber: "",
    variantId: null,
    color,
    size,
    rating: parsed.rating,
    body: parsed.body,
    status: "approved",
    verifiedPurchase: false,
    deletedAt: null,
    createdAt: now,
    updatedAt: now,
  };

  await withDb(async () => {
    const { error } = await db().from("product_reviews").insert({
      id: review.id,
      product_id: review.productId,
      customer_id: null,
      order_id: null,
      variant_id: null,
      color: review.color,
      size: review.size,
      rating: review.rating,
      body: review.body,
      customer_name: review.customerName,
      customer_email: null,
      order_number: null,
      status: "approved",
      verified_purchase: false,
    });
    if (error && /null value|not-null/i.test(error.message)) {
      fail(
        "Client reviews need a database update. Run supabase/migrations/20260923180000_admin_reviews.sql in the Supabase SQL editor.",
        503,
      );
    }
    if (error) throw error;
  });

  return toAdmin(review);
}

export async function listAdminReviews(filters?: { status?: string; productId?: string }) {
  let reviews = (await listStored()).filter((row) => !row.deletedAt);
  if (filters?.status && filters.status !== "all") {
    reviews = reviews.filter((row) => row.status === filters.status);
  }
  if (filters?.productId) {
    const query = filters.productId.trim().toLowerCase();
    reviews = reviews.filter(
      (row) =>
        row.productId.toLowerCase().includes(query) ||
        row.orderNumber.toLowerCase().includes(query) ||
        row.customerName.toLowerCase().includes(query) ||
        row.customerEmail.toLowerCase().includes(query),
    );
  }
  return reviews.map(toAdmin);
}

export async function moderateReview(id: string, status: ReviewStatus) {
  const now = new Date().toISOString();
  await withDb(async () => {
    const { data, error } = await db()
      .from("product_reviews")
      .update({ status, updated_at: now })
      .eq("id", id)
      .is("deleted_at", null)
      .select("id")
      .maybeSingle();
    if (error) throw error;
    if (!data) fail("Review not found.", 404);
  });
}

export async function deleteReview(id: string) {
  const now = new Date().toISOString();
  await withDb(async () => {
    const { data, error } = await db()
      .from("product_reviews")
      .update({ deleted_at: now, updated_at: now })
      .eq("id", id)
      .select("id")
      .maybeSingle();
    if (error) throw error;
    if (!data) fail("Review not found.", 404);
  });
}
