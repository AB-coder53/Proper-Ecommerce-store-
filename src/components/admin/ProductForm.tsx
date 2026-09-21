"use client";

import { useRouter } from "next/navigation";
import { useState, type FormEvent } from "react";
import { Loader2 } from "lucide-react";

import { ImageUploadField, ListField, SizeChartField } from "@/components/admin/AdminFields";
import { Button } from "@/components/ui/button";
import type { Product } from "@/lib/catalog-types";
import { SIZES } from "@/lib/catalog-types";

const emptyProduct = (): Product => ({
  id: "",
  name: "",
  fabric: "",
  image: "",
  images: [],
  tagline: "",
  description: "",
  details: [],
  colors: [],
  sizes: [...SIZES],
  price: "",
  badge: "",
  sizeChart: "",
  featured: true,
  sortOrder: 0,
});

export function ProductForm({ mode, initial }: { mode: "create" | "edit"; initial?: Product }) {
  const router = useRouter();
  const [form, setForm] = useState<Product>(initial ?? emptyProduct());
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);

  const set = <K extends keyof Product>(key: K, value: Product[K]) =>
    setForm((prev) => ({ ...prev, [key]: value }));

  const onSubmit = async (event: FormEvent) => {
    event.preventDefault();
    setSaving(true);
    setError("");
    try {
      const payload: Product = {
        ...form,
        images: form.images.length ? form.images : form.image ? [form.image] : [],
        image: form.image || form.images[0] || "",
        badge: form.badge || "",
        sizeChart: form.sizeChart || "",
      };
      const res = await fetch(
        mode === "create" ? "/api/admin/products" : `/api/admin/products/${form.id}`,
        {
          method: mode === "create" ? "POST" : "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        },
      );
      const data = (await res.json()) as { error?: string };
      if (!res.ok) throw new Error(data.error ?? "Save failed");
      router.push("/admin/products");
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
        <Field
          label="Product ID (slug)"
          value={form.id}
          onChange={(v) => set("id", v)}
          disabled={mode === "edit"}
          required
          placeholder="oversized-240"
        />
        <Field label="Name" value={form.name} onChange={(v) => set("name", v)} required />
        <Field label="Fabric" value={form.fabric} onChange={(v) => set("fabric", v)} required />
        <Field
          label="Price"
          value={form.price}
          onChange={(v) => set("price", v)}
          required
          placeholder="₹799/-"
        />
        <Field label="Tagline" value={form.tagline} onChange={(v) => set("tagline", v)} required />
        <Field
          label="Badge"
          value={form.badge ?? ""}
          onChange={(v) => set("badge", v)}
          placeholder="New / Popular"
        />
        <Field
          label="Sort order"
          type="number"
          value={String(form.sortOrder)}
          onChange={(v) => set("sortOrder", Number(v) || 0)}
        />
        <label className="flex items-center gap-3 pt-7 text-sm">
          <input
            type="checkbox"
            checked={form.featured}
            onChange={(e) => set("featured", e.target.checked)}
          />
          Featured on homepage
        </label>
      </div>

      <div className="space-y-2">
        <label className="text-sm font-medium">Description</label>
        <textarea
          required
          value={form.description}
          onChange={(e) => set("description", e.target.value)}
          rows={4}
          className="w-full rounded-xl border border-border px-3 py-2 text-sm"
        />
      </div>

      <ImageUploadField label="Main image" value={form.image} onChange={(v) => set("image", v)} />
      <ListField
        label="Gallery images (URLs)"
        value={form.images}
        onChange={(v) => set("images", v)}
        placeholder="/images/one.png"
      />
      <ListField label="Details" value={form.details} onChange={(v) => set("details", v)} />
      <ListField label="Colors" value={form.colors} onChange={(v) => set("colors", v)} />
      <ListField label="Sizes" value={form.sizes} onChange={(v) => set("sizes", v)} />
      <SizeChartField value={form.sizeChart ?? ""} onChange={(v) => set("sizeChart", v)} />

      {error ? <p className="text-sm text-destructive">{error}</p> : null}

      <div className="flex gap-3">
        <Button
          type="submit"
          disabled={saving}
          className="rounded-full bg-teal text-teal-foreground"
        >
          {saving ? <Loader2 className="size-4 animate-spin" /> : null}
          {mode === "create" ? "Create product" : "Save changes"}
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

function Field({
  label,
  value,
  onChange,
  required,
  disabled,
  placeholder,
  type = "text",
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  required?: boolean;
  disabled?: boolean;
  placeholder?: string;
  type?: string;
}) {
  return (
    <div className="space-y-2">
      <label className="text-sm font-medium">{label}</label>
      <input
        type={type}
        required={required}
        disabled={disabled}
        value={value}
        placeholder={placeholder}
        onChange={(e) => onChange(e.target.value)}
        className="h-11 w-full rounded-xl border border-border px-3 text-sm disabled:bg-muted"
      />
    </div>
  );
}
