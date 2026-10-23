"use client";

import { useEffect, useState, type FormEvent } from "react";
import { toast } from "sonner";

import {
  AdminDeleteButton,
  AdminIconActions,
  AdminIconButton,
  AdminList,
} from "@/components/admin/AdminList";
import { AdminPageHeader } from "@/components/admin/AdminPageHeader";
import { StatusPill } from "@/components/admin/StatusPill";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { NativeSelect } from "@/components/ui/native-select";
import { Pencil } from "lucide-react";

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

function offerLabel(coupon: Coupon) {
  if (coupon.type === "percent") return `${coupon.value}% off`;
  if (coupon.type === "per_item_fixed") return `${formatInr(coupon.value)} off each item`;
  return `${formatInr(coupon.value)} off`;
}

export default function AdminCouponsPage() {
  const [coupons, setCoupons] = useState<Coupon[]>([]);
  const [form, setForm] = useState<Coupon>(emptyCoupon());
  const [saving, setSaving] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [open, setOpen] = useState(false);
  const editing = Boolean(form.id);

  const closeForm = () => {
    setOpen(false);
    setForm(emptyCoupon());
    setError("");
  };

  const load = async () => {
    try {
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
      closeForm();
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Save failed");
    } finally {
      setSaving(false);
    }
  };

  return (
    <>
      <AdminPageHeader
        title="Coupons"
        description="Backend-validated discounts. Expired and exhausted codes are rejected automatically."
        actions={
          <Button
            type="button"
            className="rounded-full bg-teal text-teal-foreground hover:bg-teal/90"
            onClick={() => {
              setForm(emptyCoupon());
              setError("");
              setOpen(true);
            }}
          >
            Add coupon
          </Button>
        }
      />

      <Dialog
        open={open}
        onOpenChange={(next) => {
          if (!next) closeForm();
          else setOpen(true);
        }}
      >
        <DialogContent className="max-h-[min(90vh,820px)] max-w-2xl overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{editing ? "Edit coupon" : "Add coupon"}</DialogTitle>
            <DialogDescription>
              Codes are checked on the server. Expired and exhausted coupons are rejected.
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={onSubmit} className="grid gap-4 sm:grid-cols-2">
            <Field
              label="Code"
              value={form.code}
              onChange={(value) => setForm((prev) => ({ ...prev, code: value }))}
              required
            />
            <Field
              label="Name"
              value={form.name}
              onChange={(value) => setForm((prev) => ({ ...prev, name: value }))}
              required
            />
            <div className="space-y-2">
              <Label>Type</Label>
              <NativeSelect
                value={form.type}
                onChange={(event) =>
                  setForm((prev) => ({ ...prev, type: event.target.value as Coupon["type"] }))
                }
              >
                <option value="percent">Percentage off</option>
                <option value="fixed">Fixed amount off</option>
                <option value="per_item_fixed">Fixed amount off each item</option>
              </NativeSelect>
            </div>
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
              onChange={(value) =>
                setForm((prev) => ({ ...prev, minOrderValue: Number(value) || 0 }))
              }
            />
            <Field
              label="Usage limit (blank = unlimited)"
              type="number"
              value={form.usageLimit == null ? "" : String(form.usageLimit)}
              onChange={(value) =>
                setForm((prev) => ({
                  ...prev,
                  usageLimit: value === "" ? null : Number(value) || 0,
                }))
              }
            />
            <Field
              label="Maximum discount (blank = none)"
              type="number"
              value={form.maxDiscount == null ? "" : String(form.maxDiscount)}
              onChange={(value) =>
                setForm((prev) => ({
                  ...prev,
                  maxDiscount: value === "" ? null : Number(value) || 0,
                }))
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
            <div className="space-y-2">
              <Label htmlFor="coupon-starts">Starts at (optional)</Label>
              <Input
                id="coupon-starts"
                type="datetime-local"
                value={toLocalInput(form.startsAt)}
                onChange={(event) =>
                  setForm((prev) => ({
                    ...prev,
                    startsAt: event.target.value ? new Date(event.target.value).toISOString() : "",
                  }))
                }
                className="h-11 rounded-xl bg-white"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="coupon-ends">Expires at (optional)</Label>
              <Input
                id="coupon-ends"
                type="datetime-local"
                value={toLocalInput(form.endsAt)}
                onChange={(event) =>
                  setForm((prev) => ({
                    ...prev,
                    endsAt: event.target.value ? new Date(event.target.value).toISOString() : "",
                  }))
                }
                className="h-11 rounded-xl bg-white"
              />
            </div>
            <label className="flex items-center gap-2 text-sm">
              <Checkbox
                checked={form.active}
                onCheckedChange={(checked) =>
                  setForm((prev) => ({ ...prev, active: checked === true }))
                }
              />
              Active
            </label>
            {error ? <p className="text-sm text-destructive sm:col-span-2">{error}</p> : null}
            <div className="sm:col-span-2">
              <Button disabled={saving} className="rounded-full bg-teal text-teal-foreground">
                {saving ? "Saving..." : editing ? "Update coupon" : "Create coupon"}
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>

      <AdminList
        rows={coupons}
        rowKey={(coupon) => coupon.id ?? coupon.code}
        placeholder="Search coupons"
        loading={loading}
        empty="No active coupons."
        getSearchText={(coupon) =>
          `${coupon.code} ${coupon.name} ${couponStatus(coupon)} ${offerLabel(coupon)}`
        }
        columns={[
          {
            header: "Code",
            cell: (coupon) => <span className="font-mono font-medium">{coupon.code}</span>,
          },
          { header: "Offer", cell: (coupon) => offerLabel(coupon) },
          {
            header: "Status",
            cell: (coupon) => {
              const status = couponStatus(coupon);
              return <StatusPill status={status}>{status}</StatusPill>;
            },
          },
          { header: "Usage", cell: (coupon) => coupon.currentUsage ?? 0 },
          {
            header: "Actions",
            className: "w-24 text-right",
            cell: (coupon) => (
              <AdminIconActions>
                <AdminIconButton
                  label="Edit"
                  onClick={() => {
                    setForm(coupon);
                    setError("");
                    setOpen(true);
                  }}
                >
                  <Pencil className="size-4" />
                </AdminIconButton>
                {coupon.id ? (
                  <AdminDeleteButton
                    onClick={async () => {
                      if (!window.confirm("Delete this coupon?")) return;
                      await fetch(`/api/admin/coupons/${coupon.id}`, { method: "DELETE" });
                      await load();
                    }}
                  />
                ) : null}
              </AdminIconActions>
            ),
          },
        ]}
      />
    </>
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
  const id = label.toLowerCase().replace(/[^a-z0-9]+/g, "-");
  return (
    <div className="space-y-2">
      <Label htmlFor={id}>{label}</Label>
      <Input
        id={id}
        required={required}
        type={type}
        value={value}
        onChange={(event) => onChange(event.target.value)}
        className="h-11 rounded-xl bg-white"
      />
    </div>
  );
}
