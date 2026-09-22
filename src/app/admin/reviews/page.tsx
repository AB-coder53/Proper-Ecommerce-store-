"use client";

import { useEffect, useState } from "react";
import { toast } from "sonner";

import { AdminShell } from "@/components/admin/AdminShell";
import { StarRating } from "@/components/site/StarRating";
import { Button } from "@/components/ui/button";
import type { AdminReview } from "@/lib/reviews";

export default function AdminReviewsPage() {
  const [username, setUsername] = useState("Admin");
  const [reviews, setReviews] = useState<AdminReview[]>([]);
  const [status, setStatus] = useState("pending");
  const [query, setQuery] = useState("");
  const [loading, setLoading] = useState(true);
  const [busyId, setBusyId] = useState("");

  const load = async (nextStatus = status, nextQuery = query) => {
    setLoading(true);
    try {
      const auth = await fetch("/api/admin/auth");
      const authData = (await auth.json()) as { authenticated?: boolean; username?: string };
      if (!authData.authenticated) {
        window.location.href = "/admin/login";
        return;
      }
      if (authData.username) setUsername(authData.username);
      const res = await fetch(
        `/api/admin/reviews?status=${encodeURIComponent(nextStatus)}&q=${encodeURIComponent(nextQuery)}`,
      );
      const data = (await res.json()) as { reviews?: AdminReview[] };
      setReviews(data.reviews ?? []);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void load();
  }, []);

  const act = async (id: string, action: "approved" | "rejected" | "delete") => {
    if (action === "delete" && !window.confirm("Delete this review?")) return;
    setBusyId(id);
    try {
      const res =
        action === "delete"
          ? await fetch(`/api/admin/reviews/${id}`, { method: "DELETE" })
          : await fetch(`/api/admin/reviews/${id}`, {
              method: "PATCH",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({ status: action }),
            });
      if (!res.ok) throw new Error("Action failed");
      toast.success(action === "delete" ? "Review deleted" : `Review ${action}`);
      await load();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Action failed");
    } finally {
      setBusyId("");
    }
  };

  return (
    <AdminShell username={username}>
      <h1 className="font-display text-3xl font-bold">Reviews</h1>
      <p className="mt-1 text-sm text-muted-foreground">
        Approve verified-purchase reviews before they appear on the storefront.
      </p>

      <div className="mt-6 flex flex-wrap gap-3">
        <select
          value={status}
          onChange={(event) => {
            const next = event.target.value;
            setStatus(next);
            void load(next, query);
          }}
          className="h-11 rounded-full border border-border bg-background px-4 text-sm"
        >
          <option value="pending">Pending</option>
          <option value="approved">Approved</option>
          <option value="rejected">Rejected</option>
          <option value="all">All</option>
        </select>
        <input
          value={query}
          onChange={(event) => setQuery(event.target.value)}
          onKeyDown={(event) => {
            if (event.key === "Enter") void load(status, query);
          }}
          placeholder="Filter by product, customer, or order"
          className="h-11 min-w-[240px] flex-1 rounded-full border border-border px-4 text-sm"
        />
        <Button type="button" variant="outline" className="h-11 rounded-full" onClick={() => void load(status, query)}>
          Filter
        </Button>
      </div>

      <div className="mt-8 overflow-x-auto rounded-3xl border border-border bg-white">
        <table className="min-w-full text-sm">
          <thead className="border-b border-border text-left text-muted-foreground">
            <tr>
              <th className="px-4 py-3">Product</th>
              <th className="px-4 py-3">Customer</th>
              <th className="px-4 py-3">Rating</th>
              <th className="px-4 py-3">Review</th>
              <th className="px-4 py-3">Verified</th>
              <th className="px-4 py-3">Status</th>
              <th className="px-4 py-3">Date</th>
              <th className="px-4 py-3" />
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr>
                <td colSpan={8} className="px-4 py-8 text-muted-foreground">
                  Loading reviews...
                </td>
              </tr>
            ) : reviews.length ? (
              reviews.map((review) => (
                <tr key={review.id} className="border-b border-border last:border-0 align-top">
                  <td className="px-4 py-3">
                    <div className="font-medium">{review.productId}</div>
                    <div className="text-xs text-muted-foreground">
                      {review.orderNumber}
                      {review.color && review.size ? ` · ${review.color} / ${review.size}` : ""}
                    </div>
                  </td>
                  <td className="px-4 py-3">
                    <div>{review.customerName}</div>
                    <div className="text-xs text-muted-foreground">{review.customerEmail}</div>
                  </td>
                  <td className="px-4 py-3">
                    <StarRating value={review.rating} size="sm" />
                  </td>
                  <td className="max-w-xs px-4 py-3">{review.body}</td>
                  <td className="px-4 py-3">{review.verifiedPurchase ? "Yes" : "No"}</td>
                  <td className="px-4 py-3 capitalize">{review.status}</td>
                  <td className="px-4 py-3 text-muted-foreground">
                    {new Date(review.createdAt).toLocaleDateString("en-IN")}
                  </td>
                  <td className="px-4 py-3 text-right">
                    <div className="flex flex-wrap justify-end gap-2">
                      {review.status !== "approved" ? (
                        <button
                          className="font-semibold text-teal disabled:opacity-50"
                          disabled={busyId === review.id}
                          onClick={() => void act(review.id, "approved")}
                        >
                          Approve
                        </button>
                      ) : null}
                      {review.status !== "rejected" ? (
                        <button
                          className="font-semibold disabled:opacity-50"
                          disabled={busyId === review.id}
                          onClick={() => void act(review.id, "rejected")}
                        >
                          Reject
                        </button>
                      ) : null}
                      <button
                        className="text-destructive disabled:opacity-50"
                        disabled={busyId === review.id}
                        onClick={() => void act(review.id, "delete")}
                      >
                        Delete
                      </button>
                    </div>
                  </td>
                </tr>
              ))
            ) : (
              <tr>
                <td colSpan={8} className="px-4 py-8 text-center text-muted-foreground">
                  No reviews in this filter.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </AdminShell>
  );
}
