"use client";

import { useState, type FormEvent } from "react";
import { Loader2 } from "lucide-react";

import { Button } from "@/components/ui/button";
import type { Product } from "@/lib/catalog-types";
import type { ShippingSettings } from "@/lib/shipping";

export function ShippingSettingsForm({
  initial,
  products,
}: {
  initial: ShippingSettings;
  products: Product[];
}) {
  const [form, setForm] = useState<ShippingSettings>(initial);
  const [error, setError] = useState("");
  const [saved, setSaved] = useState(false);
  const [saving, setSaving] = useState(false);

  const setNumber = (key: keyof ShippingSettings, value: string) => {
    setForm((prev) => ({ ...prev, [key]: Number(value) || 0 }));
  };

  const toggleRule = (productId: string) => {
    setForm((prev) => {
      const exists = prev.productRules.some((rule) => rule.productId === productId);
      return {
        ...prev,
        productRules: exists
          ? prev.productRules.filter((rule) => rule.productId !== productId)
          : [...prev.productRules, { productId, extraMinDays: 0, extraMaxDays: 0 }],
      };
    });
  };

  const setRuleDays = (productId: string, key: "extraMinDays" | "extraMaxDays", value: string) => {
    setForm((prev) => ({
      ...prev,
      productRules: prev.productRules.map((rule) =>
        rule.productId === productId ? { ...rule, [key]: Number(value) || 0 } : rule,
      ),
    }));
  };

  const onSubmit = async (event: FormEvent) => {
    event.preventDefault();
    setSaving(true);
    setError("");
    setSaved(false);
    try {
      const res = await fetch("/api/admin/shipping", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });
      const data = (await res.json()) as { error?: string; settings?: ShippingSettings };
      if (!res.ok || !data.settings) throw new Error(data.error ?? "Save failed");
      setForm(data.settings);
      setSaved(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Save failed");
    } finally {
      setSaving(false);
    }
  };

  return (
    <form onSubmit={onSubmit} className="space-y-5 rounded-3xl border border-border bg-white p-6">
      <label className="flex items-center gap-3 text-sm">
        <input
          type="checkbox"
          checked={form.enabled}
          onChange={(e) => setForm((prev) => ({ ...prev, enabled: e.target.checked }))}
        />
        Show estimated delivery on product pages
      </label>

      <label className="flex items-center gap-3 text-sm">
        <input
          type="checkbox"
          checked={form.businessDaysOnly}
          onChange={(e) => setForm((prev) => ({ ...prev, businessDaysOnly: e.target.checked }))}
        />
        Count business days only (skip Sundays)
      </label>

      <div className="grid gap-4 sm:grid-cols-2">
        <NumberField
          label="Processing min days"
          value={form.processingMinDays}
          onChange={(v) => setNumber("processingMinDays", v)}
        />
        <NumberField
          label="Processing max days"
          value={form.processingMaxDays}
          onChange={(v) => setNumber("processingMaxDays", v)}
        />
        <NumberField
          label="Handling days"
          value={form.handlingDays}
          onChange={(v) => setNumber("handlingDays", v)}
        />
        <NumberField
          label="Shipping min days"
          value={form.shippingMinDays}
          onChange={(v) => setNumber("shippingMinDays", v)}
        />
        <NumberField
          label="Shipping max days"
          value={form.shippingMaxDays}
          onChange={(v) => setNumber("shippingMaxDays", v)}
        />
      </div>

      <div>
        <p className="text-sm font-medium">Product-specific extra days</p>
        <p className="mt-1 text-xs text-muted-foreground">
          Optional extra processing/transit time for selected products.
        </p>
        <div className="mt-3 space-y-2">
          {products.map((product) => {
            const rule = form.productRules.find((row) => row.productId === product.id);
            return (
              <div
                key={product.id}
                className="grid gap-2 rounded-xl border border-border px-3 py-2 sm:grid-cols-[1fr_6rem_6rem] sm:items-center"
              >
                <label className="flex items-center gap-2 text-sm">
                  <input
                    type="checkbox"
                    checked={Boolean(rule)}
                    onChange={() => toggleRule(product.id)}
                  />
                  {product.name}
                </label>
                {rule ? (
                  <>
                    <input
                      type="number"
                      min={0}
                      value={rule.extraMinDays}
                      onChange={(e) => setRuleDays(product.id, "extraMinDays", e.target.value)}
                      className="h-10 rounded-xl border border-border px-2 text-sm"
                      aria-label={`${product.name} extra min days`}
                    />
                    <input
                      type="number"
                      min={0}
                      value={rule.extraMaxDays}
                      onChange={(e) => setRuleDays(product.id, "extraMaxDays", e.target.value)}
                      className="h-10 rounded-xl border border-border px-2 text-sm"
                      aria-label={`${product.name} extra max days`}
                    />
                  </>
                ) : null}
              </div>
            );
          })}
        </div>
      </div>

      {error ? <p className="text-sm text-destructive">{error}</p> : null}
      {saved ? <p className="text-sm text-teal">Shipping settings saved.</p> : null}

      <Button type="submit" disabled={saving} className="rounded-full bg-teal text-teal-foreground">
        {saving ? <Loader2 className="size-4 animate-spin" /> : null}
        Save shipping settings
      </Button>
    </form>
  );
}

function NumberField({
  label,
  value,
  onChange,
}: {
  label: string;
  value: number;
  onChange: (value: string) => void;
}) {
  return (
    <label className="space-y-2 text-sm">
      <span className="font-medium">{label}</span>
      <input
        type="number"
        min={0}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="h-11 w-full rounded-xl border border-border px-3 text-sm"
      />
    </label>
  );
}
