"use client";

import { useRouter } from "next/navigation";
import { useState, type FormEvent } from "react";
import { Loader2 } from "lucide-react";

import { ImageUploadField } from "@/components/admin/AdminFields";
import { Button } from "@/components/ui/button";
import type { Collection, Product } from "@/lib/catalog-types";

const emptyCollection = (): Collection => ({
  id: "",
  title: "",
  image: "",
  productId: "",
  tint: "bg-[#f5e9a8]",
  sortOrder: 0,
});

export function CollectionForm({
  mode,
  initial,
  products,
}: {
  mode: "create" | "edit";
  initial?: Collection;
  products: Product[];
}) {
  const router = useRouter();
  const [form, setForm] = useState<Collection>(initial ?? emptyCollection());
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);

  const set = <K extends keyof Collection>(key: K, value: Collection[K]) =>
    setForm((prev) => ({ ...prev, [key]: value }));

  const onSubmit = async (event: FormEvent) => {
    event.preventDefault();
    setSaving(true);
    setError("");
    try {
      const res = await fetch(
        mode === "create" ? "/api/admin/collections" : `/api/admin/collections/${form.id}`,
        {
          method: mode === "create" ? "POST" : "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(form),
        },
      );
      const data = (await res.json()) as { error?: string };
      if (!res.ok) throw new Error(data.error ?? "Save failed");
      router.push("/admin/collections");
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
        <div className="space-y-2">
          <label className="text-sm font-medium">Collection ID (slug)</label>
          <input
            required
            disabled={mode === "edit"}
            value={form.id}
            onChange={(e) => set("id", e.target.value)}
            placeholder="oversized"
            className="h-11 w-full rounded-xl border border-border px-3 text-sm disabled:bg-muted"
          />
        </div>
        <div className="space-y-2">
          <label className="text-sm font-medium">Title</label>
          <input
            required
            value={form.title}
            onChange={(e) => set("title", e.target.value)}
            className="h-11 w-full rounded-xl border border-border px-3 text-sm"
          />
        </div>
        <div className="space-y-2">
          <label className="text-sm font-medium">Linked product</label>
          <select
            value={form.productId ?? ""}
            onChange={(e) => set("productId", e.target.value)}
            className="h-11 w-full rounded-xl border border-border px-3 text-sm"
          >
            <option value="">None</option>
            {products.map((p) => (
              <option key={p.id} value={p.id}>
                {p.name}
              </option>
            ))}
          </select>
        </div>
        <div className="space-y-2">
          <label className="text-sm font-medium">Tint class</label>
          <input
            value={form.tint}
            onChange={(e) => set("tint", e.target.value)}
            placeholder="bg-[#f5e9a8]"
            className="h-11 w-full rounded-xl border border-border px-3 text-sm"
          />
        </div>
        <div className="space-y-2">
          <label className="text-sm font-medium">Sort order</label>
          <input
            type="number"
            value={form.sortOrder}
            onChange={(e) => set("sortOrder", Number(e.target.value) || 0)}
            className="h-11 w-full rounded-xl border border-border px-3 text-sm"
          />
        </div>
      </div>

      <ImageUploadField
        label="Collection image"
        value={form.image}
        onChange={(v) => set("image", v)}
      />

      {error ? <p className="text-sm text-destructive">{error}</p> : null}

      <div className="flex gap-3">
        <Button
          type="submit"
          disabled={saving}
          className="rounded-full bg-teal text-teal-foreground"
        >
          {saving ? <Loader2 className="size-4 animate-spin" /> : null}
          {mode === "create" ? "Create collection" : "Save changes"}
        </Button>
        <Button
          type="button"
          variant="outline"
          className="rounded-full"
          onClick={() => router.back()}
        >
          Cancel
        </Button>
      </div>
    </form>
  );
}
