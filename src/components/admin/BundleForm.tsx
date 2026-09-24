"use client";

import { useRouter } from "next/navigation";
import { useState, type FormEvent } from "react";
import { Loader2 } from "lucide-react";

import { Button } from "@/components/ui/button";
import { NativeSelect } from "@/components/ui/native-select";
import type { Product } from "@/lib/catalog-types";
import { parsePriceInr } from "@/lib/price";
import type { BundleOffer } from "@/lib/store-offers";

const emptyBundle = (): BundleOffer => ({
  id: "",
  title: "",
  productIds: [],
  showOnProductIds: [],
  pricingType: "fixed",
  bundlePrice: 0,
  discountPercent: 0,
  startsAt: "",
  endsAt: "",
  active: true,
  sortOrder: 0,
});

function toLocalInput(value?: string) {
  if (!value) return "";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value.slice(0, 16);
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(date.getHours())}:${pad(date.getMinutes())}`;
}

export function BundleForm({
  mode,
  initial,
  products,
}: {
  mode: "create" | "edit";
  initial?: BundleOffer;
  products: Product[];
}) {
  const router = useRouter();
  const [form, setForm] = useState<BundleOffer>(initial ?? emptyBundle());
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);

  const toggleProduct = (id: string) => {
    setForm((prev) => ({
      ...prev,
      productIds: prev.productIds.includes(id)
        ? prev.productIds.filter((item) => item !== id)
        : [...prev.productIds, id],
    }));
  };

  const individualTotal = form.productIds.reduce((sum, id) => {
    const product = products.find((row) => row.id === id);
    return sum + parsePriceInr(product?.price);
  }, 0);

  const onSubmit = async (event: FormEvent) => {
    event.preventDefault();
    setSaving(true);
    setError("");
    try {
      const payload: BundleOffer = {
        ...form,
        showOnProductIds: form.showOnProductIds.length ? form.showOnProductIds : form.productIds,
        startsAt: form.startsAt || "",
        endsAt: form.endsAt || "",
      };
      const res = await fetch(
        mode === "create" ? "/api/admin/bundles" : `/api/admin/bundles/${form.id}`,
        {
          method: mode === "create" ? "POST" : "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        },
      );
      const data = (await res.json()) as { error?: string };
      if (!res.ok) throw new Error(data.error ?? "Save failed");
      router.push("/admin/bundles");
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Save failed");
    } finally {
      setSaving(false);
    }
  };

  return (
    <form onSubmit={onSubmit} className="space-y-5 rounded-3xl border border-border bg-white p-6">
      <div className="grid gap-4 sm:grid-cols-2">
        <label className="space-y-2 text-sm">
          <span className="font-medium">Bundle ID (slug)</span>
          <input
            required
            disabled={mode === "edit"}
            value={form.id}
            onChange={(e) => setForm((prev) => ({ ...prev, id: e.target.value }))}
            placeholder="three-tee-bundle"
            className="h-11 w-full rounded-xl border border-border px-3 text-sm disabled:bg-muted"
          />
        </label>
        <label className="space-y-2 text-sm">
          <span className="font-medium">Title</span>
          <input
            required
            value={form.title}
            onChange={(e) => setForm((prev) => ({ ...prev, title: e.target.value }))}
            placeholder="Everyday 3-pack"
            className="h-11 w-full rounded-xl border border-border px-3 text-sm"
          />
        </label>
        <label className="space-y-2 text-sm">
          <span className="font-medium">Pricing type</span>
          <NativeSelect
            value={form.pricingType ?? "fixed"}
            onChange={(e) =>
              setForm((prev) => ({
                ...prev,
                pricingType: e.target.value === "percent" ? "percent" : "fixed",
              }))
            }
          >
            <option value="fixed">Fixed bundle price</option>
            <option value="percent">Percentage discount</option>
          </NativeSelect>
        </label>
        {(form.pricingType ?? "fixed") === "percent" ? (
          <label className="space-y-2 text-sm">
            <span className="font-medium">Discount percent</span>
            <input
              required
              type="number"
              min={1}
              max={90}
              value={form.discountPercent || ""}
              onChange={(e) =>
                setForm((prev) => ({ ...prev, discountPercent: Number(e.target.value) || 0 }))
              }
              className="h-11 w-full rounded-xl border border-border px-3 text-sm"
            />
          </label>
        ) : (
          <label className="space-y-2 text-sm">
            <span className="font-medium">Bundle price (INR)</span>
            <input
              required
              type="number"
              min={1}
              value={form.bundlePrice || ""}
              onChange={(e) =>
                setForm((prev) => ({ ...prev, bundlePrice: Number(e.target.value) || 0 }))
              }
              className="h-11 w-full rounded-xl border border-border px-3 text-sm"
            />
          </label>
        )}
        <label className="space-y-2 text-sm">
          <span className="font-medium">Sort order</span>
          <input
            type="number"
            value={form.sortOrder}
            onChange={(e) =>
              setForm((prev) => ({ ...prev, sortOrder: Number(e.target.value) || 0 }))
            }
            className="h-11 w-full rounded-xl border border-border px-3 text-sm"
          />
        </label>
        <label className="space-y-2 text-sm">
          <span className="font-medium">Starts at (optional)</span>
          <input
            type="datetime-local"
            value={toLocalInput(form.startsAt)}
            onChange={(e) =>
              setForm((prev) => ({
                ...prev,
                startsAt: e.target.value ? new Date(e.target.value).toISOString() : "",
              }))
            }
            className="h-11 w-full rounded-xl border border-border px-3 text-sm"
          />
        </label>
        <label className="space-y-2 text-sm">
          <span className="font-medium">Ends at (optional)</span>
          <input
            type="datetime-local"
            value={toLocalInput(form.endsAt)}
            onChange={(e) =>
              setForm((prev) => ({
                ...prev,
                endsAt: e.target.value ? new Date(e.target.value).toISOString() : "",
              }))
            }
            className="h-11 w-full rounded-xl border border-border px-3 text-sm"
          />
        </label>
      </div>

      <label className="flex items-center gap-3 text-sm">
        <input
          type="checkbox"
          checked={form.active}
          onChange={(e) => setForm((prev) => ({ ...prev, active: e.target.checked }))}
        />
        Active
      </label>

      <div>
        <p className="text-sm font-medium">Products in this bundle</p>
        <p className="mt-1 text-xs text-muted-foreground">
          Individual total: ₹{individualTotal.toLocaleString("en-IN") || 0}
          {(form.pricingType ?? "fixed") === "percent" && form.discountPercent
            ? ` · Bundle ${Math.round(individualTotal * (1 - form.discountPercent / 100)).toLocaleString("en-IN")}`
            : form.bundlePrice
              ? ` · Bundle ₹${form.bundlePrice.toLocaleString("en-IN")}`
              : ""}
        </p>
        <div className="mt-3 grid gap-2 sm:grid-cols-2">
          {products.map((product) => (
            <label
              key={product.id}
              className="flex items-center gap-3 rounded-xl border border-border px-3 py-2 text-sm"
            >
              <input
                type="checkbox"
                checked={form.productIds.includes(product.id)}
                onChange={() => toggleProduct(product.id)}
              />
              <span className="min-w-0">
                <span className="block truncate font-medium">{product.name}</span>
                <span className="text-xs text-muted-foreground">{product.price}</span>
              </span>
            </label>
          ))}
        </div>
      </div>

      {error ? <p className="text-sm text-destructive">{error}</p> : null}

      <div className="flex flex-wrap gap-3">
        <Button
          type="submit"
          disabled={saving || deleting}
          className="rounded-full bg-teal text-teal-foreground"
        >
          {saving ? <Loader2 className="size-4 animate-spin" /> : null}
          {mode === "create" ? "Create bundle" : "Save changes"}
        </Button>
        <Button
          type="button"
          variant="outline"
          className="rounded-full"
          onClick={() => router.back()}
        >
          Cancel
        </Button>
        {mode === "edit" ? (
          <Button
            type="button"
            variant="outline"
            disabled={deleting || saving}
            className="rounded-full text-destructive"
            onClick={() => {
              if (!confirm("Delete this bundle? It will no longer appear on product pages."))
                return;
              setDeleting(true);
              void fetch(`/api/admin/bundles/${form.id}`, { method: "DELETE" })
                .then(async (res) => {
                  const data = (await res.json()) as { error?: string };
                  if (!res.ok) throw new Error(data.error ?? "Delete failed");
                  router.push("/admin/bundles");
                  router.refresh();
                })
                .catch((err: unknown) => {
                  setError(err instanceof Error ? err.message : "Delete failed");
                })
                .finally(() => setDeleting(false));
            }}
          >
            {deleting ? <Loader2 className="size-4 animate-spin" /> : null}
            Delete
          </Button>
        ) : null}
      </div>
    </form>
  );
}
