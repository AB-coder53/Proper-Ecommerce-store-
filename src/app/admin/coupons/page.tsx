"use client";

import { useEffect, useState, type FormEvent } from "react";
import { toast } from "sonner";

import { AdminShell } from "@/components/admin/AdminShell";
import { Button } from "@/components/ui/button";
import { couponStatus, type Coupon } from "@/lib/promotions";
import { formatInr } from "@/lib/price";

const emptyCoupon = (): Coupon => ({
  code: "",
  name: "",
  type: "percent",
  value: 10,
  active: true,
  startsAt: "",
  endsAt: "",
  minOrderValue: 0,
  maxDiscount: null,
  usageLimit: null,
  usagePerCustomer: null,
  productIds: [],
});

function toLocalInput(value?: string | null) {
  if (!value) return "";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value.slice(0, 16);
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(date.getHours())}:${pad(date.getMinutes())}`;
}

export default function AdminCouponsPage() {
  const [username, setUsername] = useState("Admin");
  const [coupons, setCoupons] = useState<Coupon[]>([]);
  const [form, setForm] = useState<Coupon>(emptyCoupon());
  const [saving, setSaving] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const editing = Boolean(form.id);

  const load = async () => {
    try {
      const auth = await fetch("/api/admin/auth");
      const authData = (await auth.json()) as { authenticated?: boolean; username?: string };
      if (!authData.authenticated) {
        window.location.href = "/admin/login";
        return;
      }
      if (authData.username) setUsername(authData.username);
      const res = await fetch("/api/admin/coupons");
      const data = (await res.json()) as { coupons?: Coupon[] };
      setCoupons(data.coupons ?? []);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void load();
  }, []);

  const onSubmit = async (event: FormEvent) => {
    event.preventDefault();
    setSaving(true);
    setError("");
    try {
      const res = await fetch(editing ? `/api/admin/coupons/${form.id}` : "/api/admin/coupons", {
        method: editing ? "PUT" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });
      const data = (await res.json()) as { error?: string };
      if (!res.ok) throw new Error(data.error ?? "Save failed");
      toast.success(editing ? "Coupon updated" : "Coupon created");
      setForm(emptyCoupon());
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Save failed");
    } finally {
      setSaving(false);
    }
  };

  return (
    <AdminShell username={username}>
      <h1 className="font-display text-3xl font-bold">Coupons</h1>
      <p className="mt-1 text-sm text-muted-foreground">
        Backend-validated discounts. Expired and exhausted codes are rejected automatically.
      </p>

      <form onSubmit={onSubmit} className="mt-8 grid gap-4 rounded-3xl border border-border bg-white p-6 sm:grid-cols-2">
        <Field label="Code" value={form.code} onChange={(value) => setForm((prev) => ({ ...prev, code: value }))} required />
        <Field label="Name" value={form.name} onChange={(value) => setForm((prev) => ({ ...prev, name: value }))} required />
        <label className="space-y-2 text-sm">
          <span className="font-medium">Type</span>
          <select
            value={form.type}
            onChange={(event) => setForm((prev) => ({ ...prev, type: event.target.value as Coupon["type"] }))}
            className="h-11 w-full rounded-xl border border-border px-3"
          >
            <option value="percent">Percentage off</option>
            <option value="fixed">Fixed amount off</option>
            <option value="per_item_fixed">Fixed amount off each item</option>
          </select>
        </label>
        <Field
          label={form.type === "percent" ? "Percent" : "Amount"}
          type="number"
          value={String(form.value)}
          onChange={(value) => setForm((prev) => ({ ...prev, value: Number(value) || 0 }))}
          required
        />
        <Field
          label="Minimum order value"
          type="number"
          value={String(form.minOrderValue ?? 0)}
          onChange={(value) => setForm((prev) => ({ ...prev, minOrderValue: Number(value) || 0 }))}
        />
        <Field
          label="Usage limit (blank = unlimited)"
          type="number"
          value={form.usageLimit == null ? "" : String(form.usageLimit)}
          onChange={(value) =>
            setForm((prev) => ({ ...prev, usageLimit: value === "" ? null : Number(value) || 0 }))
          }
        />
        <Field
          label="Maximum discount (blank = none)"
          type="number"
          value={form.maxDiscount == null ? "" : String(form.maxDiscount)}
          onChange={(value) =>
            setForm((prev) => ({ ...prev, maxDiscount: value === "" ? null : Number(value) || 0 }))
          }
        />
        <Field
          label="Usage per customer (blank = unlimited)"
          type="number"
          value={form.usagePerCustomer == null ? "" : String(form.usagePerCustomer)}
          onChange={(value) =>
            setForm((prev) => ({
              ...prev,
              usagePerCustomer: value === "" ? null : Number(value) || 0,
            }))
          }
        />
        <label className="space-y-2 text-sm">
          <span className="font-medium">Starts at (optional)</span>
          <input
            type="datetime-local"
            value={toLocalInput(form.startsAt)}
            onChange={(event) =>
              setForm((prev) => ({
                ...prev,
                startsAt: event.target.value ? new Date(event.target.value).toISOString() : "",
              }))
            }
            className="h-11 w-full rounded-xl border border-border px-3"
          />
        </label>
        <label className="space-y-2 text-sm">
          <span className="font-medium">Expires at (optional)</span>
          <input
            type="datetime-local"
            value={toLocalInput(form.endsAt)}
            onChange={(event) =>
              setForm((prev) => ({
                ...prev,
                endsAt: event.target.value ? new Date(event.target.value).toISOString() : "",
              }))
            }
            className="h-11 w-full rounded-xl border border-border px-3"
          />
        </label>
        <label className="flex items-center gap-2 text-sm">
          <input
            type="checkbox"
            checked={form.active}
            onChange={(event) => setForm((prev) => ({ ...prev, active: event.target.checked }))}
          />
          Active
        </label>
        {error ? <p className="text-sm text-destructive sm:col-span-2">{error}</p> : null}
        <div className="sm:col-span-2">
          <Button disabled={saving} className="rounded-full bg-teal text-teal-foreground">
            {editing ? "Update coupon" : "Create coupon"}
          </Button>
          {editing ? (
            <Button type="button" variant="outline" className="ml-2 rounded-full" onClick={() => setForm(emptyCoupon())}>
              Cancel
            </Button>
          ) : null}
        </div>
      </form>

      <div className="mt-8 overflow-x-auto rounded-3xl border border-border bg-white">
        <table className="min-w-full text-sm">
          <thead className="border-b border-border text-left text-muted-foreground">
            <tr>
              <th className="px-4 py-3">Code</th>
              <th className="px-4 py-3">Offer</th>
              <th className="px-4 py-3">Status</th>
              <th className="px-4 py-3">Usage</th>
              <th className="px-4 py-3" />
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr>
                <td colSpan={5} className="px-4 py-8 text-center text-muted-foreground">
                  Loading coupons...
                </td>
              </tr>
            ) : coupons.length ? (
              coupons.map((coupon) => (
                <tr key={coupon.id ?? coupon.code} className="border-b border-border last:border-0">
                  <td className="px-4 py-3 font-mono font-medium">{coupon.code}</td>
                  <td className="px-4 py-3">
                    {coupon.type === "percent"
                      ? `${coupon.value}% off`
                      : coupon.type === "per_item_fixed"
                        ? `${formatInr(coupon.value)} off each item`
                        : `${formatInr(coupon.value)} off`}
                  </td>
                  <td className="px-4 py-3 capitalize">{couponStatus(coupon)}</td>
                  <td className="px-4 py-3">{coupon.currentUsage ?? 0}</td>
                  <td className="px-4 py-3 text-right">
                    <button className="font-semibold text-teal" onClick={() => setForm(coupon)}>
                      Edit
                    </button>
                    {coupon.id ? (
                      <button
                        className="ml-3 text-destructive"
                        onClick={async () => {
                          if (!window.confirm("Delete this coupon?")) return;
                          await fetch(`/api/admin/coupons/${coupon.id}`, { method: "DELETE" });
                          await load();
                        }}
                      >
                        Delete
                      </button>
                    ) : null}
                  </td>
                </tr>
              ))
            ) : (
              <tr>
                <td colSpan={5} className="px-4 py-8 text-center text-muted-foreground">
                  No active coupons.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </AdminShell>
  );
}

function Field({
  label,
  value,
  onChange,
  required,
  type = "text",
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  required?: boolean;
  type?: string;
}) {
  return (
    <label className="space-y-2 text-sm">
      <span className="font-medium">{label}</span>
      <input
        required={required}
        type={type}
        value={value}
        onChange={(event) => onChange(event.target.value)}
        className="h-11 w-full rounded-xl border border-border px-3"
      />
    </label>
  );
}
