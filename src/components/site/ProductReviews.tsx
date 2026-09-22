"use client";

import { useEffect, useState, type FormEvent } from "react";
import { Loader2 } from "lucide-react";

import { useCommerce } from "@/components/commerce/CommerceProvider";
import { StarRating } from "@/components/site/StarRating";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import type { PublicReview, ReviewEligibility, ReviewSummary } from "@/lib/reviews";
import { REVIEW_MAX_LENGTH, REVIEW_MIN_LENGTH } from "@/lib/reviews";

type Payload = {
  summary: ReviewSummary;
  reviews: PublicReview[];
  page: number;
  totalPages: number;
  eligibility: ReviewEligibility;
};

export function ProductReviews({
  productId,
  initialSummary,
}: {
  productId: string;
  initialSummary?: ReviewSummary | undefined;
}) {
  const { customer, openAuth } = useCommerce();
  const [data, setData] = useState<Payload | null>(
    initialSummary
      ? {
          summary: initialSummary,
          reviews: [],
          page: 1,
          totalPages: 1,
          eligibility: { authenticated: Boolean(customer), canReview: false, reason: "" },
        }
      : null,
  );
  const [sort, setSort] = useState<"newest" | "highest" | "lowest">("newest");
  const [page, setPage] = useState(1);
  const [rating, setRating] = useState(5);
  const [body, setBody] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  const load = async (nextPage = page, nextSort = sort) => {
    const res = await fetch(
      `/api/products/${productId}/reviews?page=${nextPage}&sort=${nextSort}`,
      { cache: "no-store" },
    );
    if (!res.ok) return;
    const payload = (await res.json()) as Payload;
    setData(payload);
  };

  useEffect(() => {
    void load(page, sort);
  }, [productId, page, sort, customer?.id]);

  const summary = data?.summary ?? initialSummary;
  const eligibility = data?.eligibility;

  const submit = async (event: FormEvent) => {
    event.preventDefault();
    if (submitting) return;
    setSubmitting(true);
    setError("");
    setMessage("");
    try {
      const res = await fetch(`/api/products/${productId}/reviews`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          rating,
          body,
          ...(eligibility?.orderId ? { orderId: eligibility.orderId } : {}),
        }),
      });
      const payload = (await res.json()) as { error?: string; message?: string };
      if (!res.ok) throw new Error(payload.error || "Could not submit review.");
      setBody("");
      setRating(5);
      setMessage(payload.message || "Thanks. Your review is pending approval.");
      await load(1, sort);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Could not submit review.");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <section id="reviews" className="mt-12 border-t border-border pt-10">
      <h2 className="font-display text-2xl font-bold">Customer reviews</h2>
      {summary && summary.count > 0 ? (
        <div className="mt-4 flex flex-wrap items-end gap-6">
          <div>
            <p className="font-display text-4xl font-bold">{summary.average.toFixed(1)}</p>
            <StarRating value={Math.round(summary.average)} size="sm" />
            <p className="mt-1 text-sm text-muted-foreground">
              Based on {summary.count} review{summary.count === 1 ? "" : "s"}
            </p>
          </div>
          <ul className="min-w-0 flex-1 space-y-1 text-xs">
            {summary.distribution.map((row) => {
              const width = summary.count ? Math.round((row.count / summary.count) * 100) : 0;
              return (
                <li key={row.rating} className="flex items-center gap-2">
                  <span className="w-6">{row.rating}★</span>
                  <span className="h-2 flex-1 overflow-hidden rounded-full bg-muted">
                    <span className="block h-full bg-teal" style={{ width: `${width}%` }} />
                  </span>
                  <span className="w-6 text-right text-muted-foreground">{row.count}</span>
                </li>
              );
            })}
          </ul>
        </div>
      ) : (
        <p className="mt-3 text-sm text-muted-foreground">No reviews yet for this product.</p>
      )}

      <div className="mt-8 rounded-3xl border border-border p-5">
        <h3 className="font-semibold">Write a review</h3>
        {!customer || !eligibility?.authenticated ? (
          <div className="mt-3">
            <p className="text-sm text-muted-foreground">Please log in to submit a review.</p>
            <Button
              type="button"
              className="mt-3 h-11 rounded-full bg-teal px-5 text-xs tracking-[0.1em] text-teal-foreground uppercase"
              onClick={() =>
                openAuth({ type: "generic", redirect: `/collection/${productId}#reviews` })
              }
            >
              Login / Signup
            </Button>
          </div>
        ) : !eligibility.canReview ? (
          <p className="mt-3 text-sm text-muted-foreground">{eligibility.reason}</p>
        ) : (
          <form onSubmit={submit} className="mt-4 space-y-4">
            <div>
              <p className="text-xs font-semibold tracking-[0.12em] text-muted-foreground uppercase">
                Rating
              </p>
              <StarRating value={rating} onChange={setRating} />
            </div>
            <Textarea
              required
              minLength={REVIEW_MIN_LENGTH}
              maxLength={REVIEW_MAX_LENGTH}
              value={body}
              onChange={(event) => setBody(event.target.value)}
              placeholder="Share fit, fabric, and delivery details."
              className="min-h-28 rounded-2xl"
            />
            {error ? <p className="text-sm text-destructive">{error}</p> : null}
            {message ? <p className="text-sm text-teal">{message}</p> : null}
            <Button
              type="submit"
              disabled={submitting}
              className="h-11 rounded-full bg-teal px-6 text-xs tracking-[0.12em] text-teal-foreground uppercase"
            >
              {submitting ? <Loader2 className="size-4 animate-spin" /> : "Submit review"}
            </Button>
          </form>
        )}
      </div>

      <div className="mt-8 flex items-center justify-between gap-3">
        <h3 className="font-semibold">Reviews</h3>
        <select
          value={sort}
          onChange={(event) => {
            setPage(1);
            setSort(event.target.value as typeof sort);
          }}
          className="h-11 rounded-full border border-border bg-background px-3 text-sm"
        >
          <option value="newest">Most recent</option>
          <option value="highest">Highest rating</option>
          <option value="lowest">Lowest rating</option>
        </select>
      </div>
      <ul className="mt-4 space-y-4">
        {(data?.reviews ?? []).map((review) => (
          <li key={review.id} className="rounded-3xl border border-border p-5">
            <StarRating value={review.rating} size="sm" />
            <p className="mt-3 text-sm leading-relaxed">{review.body}</p>
            <p className="mt-3 text-xs text-muted-foreground">
              {review.verifiedPurchase ? "Verified purchase · " : ""}
              {review.displayName}
              {review.color && review.size ? ` · ${review.color} / ${review.size}` : ""}
              {" · "}
              {new Date(review.createdAt).toLocaleDateString("en-IN", {
                day: "numeric",
                month: "long",
                year: "numeric",
              })}
            </p>
          </li>
        ))}
      </ul>
      {data && data.totalPages > 1 ? (
        <div className="mt-4 flex gap-2">
          <Button
            type="button"
            variant="outline"
            className="rounded-full"
            disabled={page <= 1}
            onClick={() => setPage((current) => Math.max(1, current - 1))}
          >
            Previous
          </Button>
          <Button
            type="button"
            variant="outline"
            className="rounded-full"
            disabled={page >= data.totalPages}
            onClick={() => setPage((current) => current + 1)}
          >
            Next
          </Button>
        </div>
      ) : null}
    </section>
  );
}
