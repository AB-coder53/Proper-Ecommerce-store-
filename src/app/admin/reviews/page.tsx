"use client";

import { useEffect, useState } from "react";
import { toast } from "sonner";

import { AdminShell } from "@/components/admin/AdminShell";
import { StarRating } from "@/components/site/StarRating";
import { Button } from "@/components/ui/button";
import { NativeSelect } from "@/components/ui/native-select";
import type { AdminReview } from "@/lib/reviews";

type CatalogProduct = { id: string; name: string; colors: string[]; sizes: string[] };

export default function AdminReviewsPage() {
  const [username, setUsername] = useState("Admin");
  const [reviews, setReviews] = useState<AdminReview[]>([]);
  const [products, setProducts] = useState<CatalogProduct[]>([]);
  const [status, setStatus] = useState("pending");
  const [query, setQuery] = useState("");
  const [loading, setLoading] = useState(true);
  const [busyId, setBusyId] = useState("");
  const [saving, setSaving] = useState(false);
  const [productId, setProductId] = useState("");
  const [reviewerName, setReviewerName] = useState("");
  const [rating, setRating] = useState("5");
  const [body, setBody] = useState("");
  const [color, setColor] = useState("");
  const [size, setSize] = useState("");

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
      const catalogRes = await fetch("/api/catalog");
      if (catalogRes.ok) {
        const catalog = (await catalogRes.json()) as { products?: CatalogProduct[] };
        setProducts(catalog.products ?? []);
      }
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

  const selected = products.find((product) => product.id === productId);

  const addReview = async () => {
    setSaving(true);
    try {
      const res = await fetch("/api/admin/reviews", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          productId,
          reviewerName,
          rating: Number(rating),
          body,
          color,
          size,
        }),
      });
      const data = (await res.json()) as { error?: string };
      if (!res.ok) throw new Error(data.error || "Could not add review.");
      toast.success("Review added to the product");
      setReviewerName("");
      setBody("");
      setColor("");
      setSize("");
      setStatus("approved");
      await load("approved", query);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Could not add review.");
    } finally {
      setSaving(false);
    }
  };

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
        Approve customer reviews, or add a past client review so it shows on the product page.
      </p>

      <form
        className="mt-6 grid gap-3 rounded-3xl border border-border bg-white p-5 sm:grid-cols-2"
        onSubmit={(event) => {
          event.preventDefault();
          void addReview();
        }}
      >
        <h2 className="font-display text-xl font-bold sm:col-span-2">Add client review</h2>
        <label className="text-sm">
          Product
          <NativeSelect
            required
            value={productId}
            wrapperClassName="mt-1"
            onChange={(event) => {
              setProductId(event.target.value);
              setColor("");
              setSize("");
            }}
          >
            <option value="">Select a product</option>
            {products.map((product) => (
              <option key={product.id} value={product.id}>
                {product.name}
              </option>
            ))}
          </NativeSelect>
        </label>
        <label className="text-sm">
          Client name
          <input
            required
            value={reviewerName}
            onChange={(event) => setReviewerName(event.target.value)}
            className="mt-1 h-11 w-full rounded-xl border border-border px-3"
            placeholder="Name shown on the product"
          />
        </label>
        <label className="text-sm">
          Rating
          <NativeSelect
            value={rating}
            wrapperClassName="mt-1"
            onChange={(event) => setRating(event.target.value)}
          >
            {[5, 4, 3, 2, 1].map((value) => (
              <option key={value} value={value}>
                {value} star{value === 1 ? "" : "s"}
              </option>
            ))}
          </NativeSelect>
        </label>
        <div className="grid grid-cols-2 gap-3">
          <label className="text-sm">
            Colour
            <NativeSelect
              value={color}
              wrapperClassName="mt-1"
              onChange={(event) => setColor(event.target.value)}
            >
              <option value="">Optional</option>
              {(selected?.colors ?? []).map((value) => (
                <option key={value} value={value}>
                  {value}
                </option>
              ))}
            </NativeSelect>
          </label>
          <label className="text-sm">
            Size
            <NativeSelect
              value={size}
              wrapperClassName="mt-1"
              onChange={(event) => setSize(event.target.value)}
            >
              <option value="">Optional</option>
              {(selected?.sizes ?? []).map((value) => (
                <option key={value} value={value}>
                  {value}
                </option>
              ))}
            </NativeSelect>
          </label>
        </div>
        <label className="text-sm sm:col-span-2">
          Review
          <textarea
            required
            value={body}
            onChange={(event) => setBody(event.target.value)}
            rows={4}
            className="mt-1 w-full rounded-xl border border-border px-3 py-2"
            placeholder="What the client said about this piece"
          />
        </label>
        <div className="sm:col-span-2">
          <Button
            type="submit"
            disabled={saving}
            className="h-11 rounded-full bg-teal text-teal-foreground"
          >
            {saving ? "Adding..." : "Add review"}
          </Button>
        </div>
      </form>

      <div className="mt-6 flex flex-wrap gap-3">
        <NativeSelect
          value={status}
          onChange={(event) => {
            const next = event.target.value;
            setStatus(next);
            void load(next, query);
          }}
          className="w-auto rounded-full px-4"
        >
          <option value="pending">Pending</option>
          <option value="approved">Approved</option>
          <option value="rejected">Rejected</option>
          <option value="all">All</option>
        </NativeSelect>
        <input
          value={query}
          onChange={(event) => setQuery(event.target.value)}
          onKeyDown={(event) => {
            if (event.key === "Enter") void load(status, query);
          }}
          placeholder="Filter by product, customer, or order"
          className="h-11 min-w-[240px] flex-1 rounded-full border border-border px-4 text-sm"
        />
        <Button
          type="button"
          variant="outline"
          className="h-11 rounded-full"
          onClick={() => void load(status, query)}
        >
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
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          className="rounded-full"
                          disabled={busyId === review.id}
                          onClick={() => void act(review.id, "approved")}
                        >
                          Approve
                        </Button>
                      ) : null}
                      {review.status !== "rejected" ? (
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          className="rounded-full"
                          disabled={busyId === review.id}
                          onClick={() => void act(review.id, "rejected")}
                        >
                          Reject
                        </Button>
                      ) : null}
                      <Button
                        type="button"
                        variant="destructive"
                        size="sm"
                        className="rounded-full"
                        disabled={busyId === review.id}
                        onClick={() => void act(review.id, "delete")}
                      >
                        Delete
                      </Button>
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
