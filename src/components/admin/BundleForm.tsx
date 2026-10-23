"use client";

import { useRouter } from "next/navigation";
import { useState, type FormEvent } from "react";
import { Loader2, Plus, Trash2 } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { NativeSelect } from "@/components/ui/native-select";
import type { Product } from "@/lib/catalog-types";
import { colorSwatchClass } from "@/lib/product-colors";
import { parsePriceInr } from "@/lib/price";
import type { BundleOffer } from "@/lib/store-offers";
import { cn } from "@/lib/utils";

const emptyBundle = (): BundleOffer => ({
  id: "",
  title: "",
  productIds: [],
  productColors: [],
  showOnProductIds: [],
  pricingType: "fixed",
  bundlePrice: 0,
  discountPercent: 0,
  startsAt: "",
  endsAt: "",
  active: true,
  sortOrder: 0,
});

function nextBundleLine(products: Product[], existing: { productId: string; color: string }[]) {
  const unused = products.find(
    (product) => !existing.some((line) => line.productId === product.id),
  );
  const product = unused ?? products[0];
  if (!product) return { productId: "", color: "" };
  const usedColors = new Set(
    existing.filter((line) => line.productId === product.id).map((line) => line.color),
  );
  const color = product.colors.find((item) => !usedColors.has(item)) ?? product.colors[0] ?? "";
  return { productId: product.id, color };
}

function withBundleLines(offer: BundleOffer, products: Product[]): BundleOffer {
  const productIds = [...offer.productIds];
  const productColors = offer.productIds.map((id, index) => {
    const product = products.find((row) => row.id === id);
    const saved = offer.productColors[index] ?? "";
    if (saved && product?.colors.includes(saved)) return saved;
    return product?.colors[0] ?? "";
  });
  while (productIds.length < 2 && products.length) {
    const line = nextBundleLine(
      products,
      productIds.map((productId, index) => ({ productId, color: productColors[index] ?? "" })),
    );
    if (!line.productId) break;
    productIds.push(line.productId);
    productColors.push(line.color);
  }
  return { ...offer, productIds, productColors };
}

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
  const [form, setForm] = useState<BundleOffer>(() =>
    withBundleLines(initial ?? emptyBundle(), products),
  );
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);

  const setLineProduct = (index: number, productId: string) => {
    const product = products.find((row) => row.id === productId);
    setForm((prev) => {
      const productIds = [...prev.productIds];
      const productColors = [...prev.productColors];
      productIds[index] = productId;
      const current = productColors[index] ?? "";
      productColors[index] =
        current && product?.colors.includes(current) ? current : (product?.colors[0] ?? "");
      return { ...prev, productIds, productColors };
    });
  };

  const setLineColor = (index: number, color: string) => {
    setForm((prev) => {
      const productColors = [...prev.productColors];
      productColors[index] = color;
      return { ...prev, productColors };
    });
  };

  const addLine = () => {
    setForm((prev) => {
      if (prev.productIds.length >= 12) return prev;
      const line = nextBundleLine(
        products,
        prev.productIds.map((productId, index) => ({
          productId,
          color: prev.productColors[index] ?? "",
        })),
      );
      if (!line.productId) return prev;
      return {
        ...prev,
        productIds: [...prev.productIds, line.productId],
        productColors: [...prev.productColors, line.color],
      };
    });
  };

  const removeLine = (index: number) => {
    setForm((prev) => {
      if (prev.productIds.length <= 2) return prev;
      return {
        ...prev,
        productIds: prev.productIds.filter((_, itemIndex) => itemIndex !== index),
        productColors: prev.productColors.filter((_, itemIndex) => itemIndex !== index),
      };
    });
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
        showOnProductIds: [...new Set(form.productIds)],
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
    <Card className="bg-white shadow-none">
      <form onSubmit={onSubmit} className="space-y-5 p-6">
        <div className="grid gap-4 sm:grid-cols-2">
          <label className="space-y-2 text-sm">
            <span className="font-medium">Bundle ID (slug)</span>
            <Input
              required
              disabled={mode === "edit"}
              value={form.id}
              onChange={(e) => setForm((prev) => ({ ...prev, id: e.target.value }))}
              placeholder="three-tee-bundle"
              className="h-11 rounded-xl bg-white"
            />
          </label>
          <label className="space-y-2 text-sm">
            <span className="font-medium">Title</span>
            <Input
              required
              value={form.title}
              onChange={(e) => setForm((prev) => ({ ...prev, title: e.target.value }))}
              placeholder="Everyday 3-pack"
              className="h-11 rounded-xl bg-white"
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
              <Input
                required
                type="number"
                min={1}
                max={90}
                value={form.discountPercent || ""}
                onChange={(e) =>
                  setForm((prev) => ({ ...prev, discountPercent: Number(e.target.value) || 0 }))
                }
                className="h-11 rounded-xl bg-white"
              />
            </label>
          ) : (
            <label className="space-y-2 text-sm">
              <span className="font-medium">Bundle price (INR)</span>
              <Input
                required
                type="number"
                min={1}
                value={form.bundlePrice || ""}
                onChange={(e) =>
                  setForm((prev) => ({ ...prev, bundlePrice: Number(e.target.value) || 0 }))
                }
                className="h-11 rounded-xl bg-white"
              />
            </label>
          )}
          <label className="space-y-2 text-sm">
            <span className="font-medium">Sort order</span>
            <Input
              type="number"
              value={form.sortOrder}
              onChange={(e) =>
                setForm((prev) => ({ ...prev, sortOrder: Number(e.target.value) || 0 }))
              }
              className="h-11 rounded-xl bg-white"
            />
          </label>
          <label className="space-y-2 text-sm">
            <span className="font-medium">Starts at (optional)</span>
            <Input
              type="datetime-local"
              value={toLocalInput(form.startsAt)}
              onChange={(e) =>
                setForm((prev) => ({
                  ...prev,
                  startsAt: e.target.value ? new Date(e.target.value).toISOString() : "",
                }))
              }
              className="h-11 rounded-xl bg-white"
            />
          </label>
          <label className="space-y-2 text-sm">
            <span className="font-medium">Ends at (optional)</span>
            <Input
              type="datetime-local"
              value={toLocalInput(form.endsAt)}
              onChange={(e) =>
                setForm((prev) => ({
                  ...prev,
                  endsAt: e.target.value ? new Date(e.target.value).toISOString() : "",
                }))
              }
              className="h-11 rounded-xl bg-white"
            />
          </label>
        </div>

        <label className="flex items-center gap-3 text-sm">
          <Checkbox
            checked={form.active}
            onCheckedChange={(checked) =>
              setForm((prev) => ({ ...prev, active: checked === true }))
            }
          />
          Active
        </label>

        <div>
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <p className="text-sm font-medium">Products in this bundle</p>
              <p className="mt-1 text-xs text-muted-foreground">
                Add two or more tees, and choose the colour for each one. The same product can be
                added again in another colour.
              </p>
            </div>
            <Button
              type="button"
              variant="outline"
              className="rounded-full"
              disabled={form.productIds.length >= 12 || products.length === 0}
              onClick={addLine}
            >
              <Plus className="size-4" />
              Add product
            </Button>
          </div>
          <p className="mt-2 text-xs text-muted-foreground">
            Individual total: ₹{individualTotal.toLocaleString("en-IN") || 0}
            {(form.pricingType ?? "fixed") === "percent" && form.discountPercent
              ? ` · Bundle ${Math.round(individualTotal * (1 - form.discountPercent / 100)).toLocaleString("en-IN")}`
              : form.bundlePrice
                ? ` · Bundle ₹${form.bundlePrice.toLocaleString("en-IN")}`
                : ""}
          </p>
          <div className="mt-3 space-y-3">
            {form.productIds.map((productId, index) => {
              const product = products.find((row) => row.id === productId);
              const color = form.productColors[index] ?? "";
              return (
                <div key={`${index}-${productId}`} className="rounded-xl border border-border p-3">
                  <div className="flex items-start gap-3">
                    <div className="min-w-0 flex-1 space-y-3">
                      <label className="block space-y-2 text-sm">
                        <span className="font-medium">Product {index + 1}</span>
                        <NativeSelect
                          value={productId}
                          onChange={(event) => setLineProduct(index, event.target.value)}
                        >
                          {products.map((row) => (
                            <option key={row.id} value={row.id}>
                              {row.name} · {row.price}
                            </option>
                          ))}
                        </NativeSelect>
                      </label>
                      <div>
                        <p className="text-xs font-medium text-muted-foreground">Colour</p>
                        <div className="mt-2 flex flex-wrap gap-2">
                          {(product?.colors ?? []).map((option) => {
                            const selected = option === color;
                            return (
                              <button
                                key={option}
                                type="button"
                                aria-pressed={selected}
                                onClick={() => setLineColor(index, option)}
                                className={cn(
                                  "inline-flex h-10 items-center gap-2 rounded-full border px-3 text-sm",
                                  selected
                                    ? "border-foreground bg-foreground text-background"
                                    : "border-border bg-background hover:border-foreground",
                                )}
                              >
                                <span
                                  aria-hidden
                                  className={cn(
                                    "size-3.5 rounded-full shadow-[inset_0_0_0_1px_rgba(0,0,0,0.15)]",
                                    colorSwatchClass(option),
                                  )}
                                />
                                {option}
                              </button>
                            );
                          })}
                        </div>
                      </div>
                    </div>
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      className="shrink-0"
                      aria-label={`Remove product ${index + 1}`}
                      disabled={form.productIds.length <= 2}
                      onClick={() => removeLine(index)}
                    >
                      <Trash2 className="size-4" />
                    </Button>
                  </div>
                </div>
              );
            })}
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
    </Card>
  );
}
