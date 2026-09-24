"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useMemo, useState, type FormEvent } from "react";
import { Loader2, Plus, Trash2 } from "lucide-react";
import { toast } from "sonner";

import { DangerButton } from "@/components/admin/AdminFields";
import { OrderTimeline } from "@/components/commerce/OrderTimeline";
import { Button } from "@/components/ui/button";
import { NativeSelect } from "@/components/ui/native-select";
import type { Product } from "@/lib/catalog-types";
import {
  ORDER_STATUS_LABELS,
  ORDER_STATUSES,
  PAYMENT_STATUS_LABELS,
} from "@/lib/commerce-constants";
import type { Order } from "@/lib/commerce-types";
import type { OrderNotification } from "@/lib/notifications";
import { formatInr, parsePriceInr } from "@/lib/price";

const EXTRA = ["cancelled", "failed", "returned"] as const;
const INPUT = "h-11 w-full rounded-xl border border-border bg-white px-3 text-sm disabled:bg-muted";

type FormItem = {
  productId: string;
  productName: string;
  productImage: string;
  size: string;
  color: string;
  quantity: number;
  unitPrice: number;
};

type FormState = {
  customerName: string;
  customerEmail: string;
  customerPhone: string;
  alternatePhone: string;
  addressLine1: string;
  addressLine2: string;
  addressCity: string;
  addressState: string;
  addressPincode: string;
  orderStatus: string;
  paymentStatus: string;
  trackingNumber: string;
  carrier: string;
  trackingUrl: string;
  shippingCost: number;
  discount: number;
  items: FormItem[];
};

function emptyItem(): FormItem {
  return {
    productId: "",
    productName: "",
    productImage: "",
    size: "M",
    color: "",
    quantity: 1,
    unitPrice: 0,
  };
}

function fromOrder(order: Order): FormState {
  return {
    customerName: order.customerName,
    customerEmail: order.customerEmail,
    customerPhone: order.customerPhone,
    alternatePhone: order.alternatePhone ?? "",
    addressLine1: order.addressLine1,
    addressLine2: order.addressLine2 ?? "",
    addressCity: order.addressCity,
    addressState: order.addressState,
    addressPincode: order.addressPincode,
    orderStatus: order.orderStatus,
    paymentStatus: order.paymentStatus,
    trackingNumber: order.trackingNumber ?? "",
    carrier: order.carrier ?? "",
    trackingUrl: order.trackingUrl ?? "",
    shippingCost: order.shippingCost,
    discount: order.discount,
    items: order.items.length
      ? order.items.map((item) => ({
          productId: item.productId,
          productName: item.productName,
          productImage: item.productImage ?? "",
          size: item.size,
          color: item.color,
          quantity: item.quantity,
          unitPrice: item.unitPrice,
        }))
      : [emptyItem()],
  };
}

function emptyForm(): FormState {
  return {
    customerName: "",
    customerEmail: "",
    customerPhone: "",
    alternatePhone: "",
    addressLine1: "",
    addressLine2: "",
    addressCity: "",
    addressState: "",
    addressPincode: "",
    orderStatus: "confirmed",
    paymentStatus: "pending",
    trackingNumber: "",
    carrier: "",
    trackingUrl: "",
    shippingCost: 0,
    discount: 0,
    items: [emptyItem()],
  };
}

export function OrderForm({
  mode,
  products,
  initial,
}: {
  mode: "create" | "edit";
  products: Product[];
  initial?: Order;
}) {
  const router = useRouter();
  const [form, setForm] = useState<FormState>(initial ? fromOrder(initial) : emptyForm());
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [notifications, setNotifications] = useState<OrderNotification[]>([]);

  useEffect(() => {
    if (mode !== "edit" || !initial) return;
    void (async () => {
      const res = await fetch(`/api/admin/orders/${initial.id}/notifications`);
      if (!res.ok) return;
      const data = (await res.json()) as { notifications?: OrderNotification[] };
      setNotifications(data.notifications ?? []);
    })();
  }, [initial, mode]);

  const subtotal = useMemo(
    () => form.items.reduce((sum, item) => sum + item.unitPrice * item.quantity, 0),
    [form.items],
  );
  const total = Math.max(0, subtotal + form.shippingCost - form.discount);

  const setField = <K extends keyof FormState>(key: K, value: FormState[K]) =>
    setForm((current) => ({ ...current, [key]: value }));

  const setItem = (index: number, patch: Partial<FormItem>) => {
    setForm((current) => ({
      ...current,
      items: current.items.map((item, itemIndex) =>
        itemIndex === index ? { ...item, ...patch } : item,
      ),
    }));
  };

  const pickProduct = (index: number, productId: string) => {
    const product = products.find((row) => row.id === productId);
    if (!product) {
      setItem(index, { productId: "", productName: "", productImage: "", color: "", unitPrice: 0 });
      return;
    }
    setItem(index, {
      productId: product.id,
      productName: product.name,
      productImage: product.image,
      color: product.colors[0] ?? "",
      size: product.sizes[0] ?? "M",
      unitPrice: parsePriceInr(product.price),
    });
  };

  const onSubmit = async (event: FormEvent) => {
    event.preventDefault();
    setSaving(true);
    setError("");
    try {
      const res = await fetch(
        mode === "create" ? "/api/admin/orders" : `/api/admin/orders/${initial!.id}`,
        {
          method: mode === "create" ? "POST" : "PUT",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            ...form,
            shippingCost: Number(form.shippingCost) || 0,
            discount: Number(form.discount) || 0,
            items: form.items.map((item) => ({
              ...item,
              quantity: Number(item.quantity) || 1,
              unitPrice: Number(item.unitPrice) || 0,
            })),
          }),
        },
      );
      const data = (await res.json()) as { order?: Order; error?: string };
      if (!res.ok || !data.order) throw new Error(data.error || "Could not save order.");
      toast.success(
        mode === "create"
          ? `Order #${data.order.orderNumber} created.`
          : `Order #${data.order.orderNumber} updated.`,
      );
      if (mode === "create") {
        router.push(`/admin/orders/${data.order.id}`);
      } else {
        setForm(fromOrder(data.order));
      }
      router.refresh();
    } catch (err) {
      const message = err instanceof Error ? err.message : "Could not save order.";
      setError(message);
      toast.error(message);
    } finally {
      setSaving(false);
    }
  };

  return (
    <form onSubmit={onSubmit} className="space-y-6">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <Link
            href="/admin/orders"
            className="text-sm text-muted-foreground hover:text-foreground"
          >
            ← Orders
          </Link>
          <h1 className="mt-3 font-display text-3xl font-bold">
            {mode === "create" ? "New order" : `Order #${initial?.orderNumber}`}
          </h1>
          {initial ? (
            <p className="mt-1 text-sm text-muted-foreground">
              Updated {new Date(initial.updatedAt).toLocaleString("en-IN")}
            </p>
          ) : (
            <p className="mt-1 text-sm text-muted-foreground">
              Create a phone / WhatsApp / reservation order. Customers see it immediately.
            </p>
          )}
        </div>
        <div className="flex flex-wrap gap-2">
          {mode === "edit" && initial ? (
            <>
              <Button asChild variant="outline" className="h-11 rounded-full">
                <a
                  href={`/api/admin/orders/${initial.id}/invoice`}
                  target="_blank"
                  rel="noreferrer"
                >
                  Invoice
                </a>
              </Button>
              <DangerButton
                label="Delete order"
                onConfirm={async () => {
                  const res = await fetch(`/api/admin/orders/${initial.id}`, { method: "DELETE" });
                  const data = (await res.json()) as { error?: string };
                  if (!res.ok) {
                    toast.error(data.error || "Could not delete order.");
                    return;
                  }
                  toast.success("Order deleted.");
                  router.push("/admin/orders");
                  router.refresh();
                }}
              />
            </>
          ) : null}
          <Button
            type="submit"
            disabled={saving}
            className="h-11 rounded-full bg-teal px-6 text-xs tracking-[0.1em] text-teal-foreground uppercase"
          >
            {saving ? <Loader2 className="size-4 animate-spin" /> : null}
            {mode === "create" ? "Create order" : "Save changes"}
          </Button>
        </div>
      </div>

      {error ? <p className="text-sm text-destructive">{error}</p> : null}

      <section className="rounded-2xl border border-border bg-white p-5">
        <h2 className="font-semibold">Customer</h2>
        <div className="mt-4 grid gap-4 sm:grid-cols-2">
          <label className="text-sm">
            Name
            <input
              required
              value={form.customerName}
              onChange={(e) => setField("customerName", e.target.value)}
              className={`mt-1.5 ${INPUT}`}
            />
          </label>
          <label className="text-sm">
            Email
            <input
              required
              type="email"
              value={form.customerEmail}
              onChange={(e) => setField("customerEmail", e.target.value)}
              className={`mt-1.5 ${INPUT}`}
            />
          </label>
          <label className="text-sm">
            Phone
            <input
              required
              value={form.customerPhone}
              onChange={(e) => setField("customerPhone", e.target.value)}
              className={`mt-1.5 ${INPUT}`}
            />
          </label>
          <label className="text-sm">
            Alternate phone
            <input
              value={form.alternatePhone}
              onChange={(e) => setField("alternatePhone", e.target.value)}
              className={`mt-1.5 ${INPUT}`}
            />
          </label>
        </div>
      </section>

      <section className="rounded-2xl border border-border bg-white p-5">
        <h2 className="font-semibold">Delivery address</h2>
        <div className="mt-4 grid gap-4 sm:grid-cols-2">
          <label className="text-sm sm:col-span-2">
            Address line 1
            <input
              required
              value={form.addressLine1}
              onChange={(e) => setField("addressLine1", e.target.value)}
              className={`mt-1.5 ${INPUT}`}
            />
          </label>
          <label className="text-sm sm:col-span-2">
            Address line 2
            <input
              value={form.addressLine2}
              onChange={(e) => setField("addressLine2", e.target.value)}
              className={`mt-1.5 ${INPUT}`}
            />
          </label>
          <label className="text-sm">
            City
            <input
              required
              value={form.addressCity}
              onChange={(e) => setField("addressCity", e.target.value)}
              className={`mt-1.5 ${INPUT}`}
            />
          </label>
          <label className="text-sm">
            State
            <input
              required
              value={form.addressState}
              onChange={(e) => setField("addressState", e.target.value)}
              className={`mt-1.5 ${INPUT}`}
            />
          </label>
          <label className="text-sm">
            PIN code
            <input
              required
              inputMode="numeric"
              maxLength={6}
              value={form.addressPincode}
              onChange={(e) =>
                setField("addressPincode", e.target.value.replace(/\D/g, "").slice(0, 6))
              }
              className={`mt-1.5 ${INPUT}`}
            />
          </label>
        </div>
      </section>

      <section className="rounded-2xl border border-border bg-white p-5">
        <div className="flex items-center justify-between gap-3">
          <h2 className="font-semibold">Items</h2>
          <Button
            type="button"
            variant="outline"
            className="h-10 rounded-full"
            onClick={() => setField("items", [...form.items, emptyItem()])}
          >
            <Plus className="size-4" />
            Add item
          </Button>
        </div>
        <div className="mt-4 space-y-4">
          {form.items.map((item, index) => {
            const product = products.find((row) => row.id === item.productId);
            return (
              <div
                key={`${item.productId}-${index}`}
                className="rounded-2xl border border-border p-4"
              >
                <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-6">
                  <label className="text-sm lg:col-span-2">
                    Product
                    <NativeSelect
                      value={item.productId}
                      wrapperClassName="mt-1.5"
                      onChange={(e) => pickProduct(index, e.target.value)}
                      className={INPUT}
                    >
                      <option value="">Custom item</option>
                      {products.map((row) => (
                        <option key={row.id} value={row.id}>
                          {row.name}
                        </option>
                      ))}
                    </NativeSelect>
                  </label>
                  <label className="text-sm lg:col-span-2">
                    Name
                    <input
                      required
                      value={item.productName}
                      onChange={(e) => setItem(index, { productName: e.target.value })}
                      className={`mt-1.5 ${INPUT}`}
                    />
                  </label>
                  <label className="text-sm">
                    Colour
                    {product?.colors.length ? (
                      <NativeSelect
                        value={item.color}
                        wrapperClassName="mt-1.5"
                        onChange={(e) => setItem(index, { color: e.target.value })}
                        className={INPUT}
                      >
                        {product.colors.map((color) => (
                          <option key={color} value={color}>
                            {color}
                          </option>
                        ))}
                      </NativeSelect>
                    ) : (
                      <input
                        required
                        value={item.color}
                        onChange={(e) => setItem(index, { color: e.target.value })}
                        className={`mt-1.5 ${INPUT}`}
                      />
                    )}
                  </label>
                  <label className="text-sm">
                    Size
                    {product?.sizes.length ? (
                      <NativeSelect
                        value={item.size}
                        wrapperClassName="mt-1.5"
                        onChange={(e) => setItem(index, { size: e.target.value })}
                        className={INPUT}
                      >
                        {product.sizes.map((size) => (
                          <option key={size} value={size}>
                            {size}
                          </option>
                        ))}
                      </NativeSelect>
                    ) : (
                      <input
                        required
                        value={item.size}
                        onChange={(e) => setItem(index, { size: e.target.value })}
                        className={`mt-1.5 ${INPUT}`}
                      />
                    )}
                  </label>
                  <label className="text-sm">
                    Qty
                    <input
                      type="number"
                      min={1}
                      max={20}
                      value={item.quantity}
                      onChange={(e) => setItem(index, { quantity: Number(e.target.value) || 1 })}
                      className={`mt-1.5 ${INPUT}`}
                    />
                  </label>
                  <label className="text-sm">
                    Unit ₹
                    <input
                      type="number"
                      min={0}
                      value={item.unitPrice}
                      onChange={(e) => setItem(index, { unitPrice: Number(e.target.value) || 0 })}
                      className={`mt-1.5 ${INPUT}`}
                    />
                  </label>
                  <div className="flex items-end justify-between gap-3 lg:col-span-4">
                    <p className="text-sm font-semibold">
                      {formatInr(item.unitPrice * item.quantity)}
                    </p>
                    {form.items.length > 1 ? (
                      <Button
                        type="button"
                        variant="ghost"
                        className="h-10 rounded-full text-destructive"
                        onClick={() =>
                          setField(
                            "items",
                            form.items.filter((_, itemIndex) => itemIndex !== index),
                          )
                        }
                      >
                        <Trash2 className="size-4" />
                        Remove
                      </Button>
                    ) : null}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
        <div className="mt-4 grid gap-4 sm:grid-cols-3">
          <label className="text-sm">
            Shipping ₹
            <input
              type="number"
              min={0}
              value={form.shippingCost}
              onChange={(e) => setField("shippingCost", Number(e.target.value) || 0)}
              className={`mt-1.5 ${INPUT}`}
            />
          </label>
          <label className="text-sm">
            Discount ₹
            <input
              type="number"
              min={0}
              value={form.discount}
              onChange={(e) => setField("discount", Number(e.target.value) || 0)}
              className={`mt-1.5 ${INPUT}`}
            />
          </label>
          <div className="rounded-xl bg-sand px-4 py-3 text-sm">
            <p className="text-muted-foreground">Subtotal {formatInr(subtotal)}</p>
            <p className="mt-1 font-bold text-teal">Total {formatInr(total)}</p>
          </div>
        </div>
      </section>

      <section className="rounded-2xl border border-border bg-white p-5">
        <h2 className="font-semibold">Status</h2>
        <div className="mt-4 grid gap-4 sm:grid-cols-2">
          <label className="text-sm">
            Order status
            <NativeSelect
              value={form.orderStatus}
              wrapperClassName="mt-1.5"
              onChange={(e) => setField("orderStatus", e.target.value)}
              className={INPUT}
            >
              {[...ORDER_STATUSES, ...EXTRA].map((value) => (
                <option key={value} value={value}>
                  {ORDER_STATUS_LABELS[value] ?? value}
                </option>
              ))}
            </NativeSelect>
          </label>
          <label className="text-sm">
            Payment
            <NativeSelect
              value={form.paymentStatus}
              wrapperClassName="mt-1.5"
              onChange={(e) => setField("paymentStatus", e.target.value)}
              className={INPUT}
            >
              {Object.keys(PAYMENT_STATUS_LABELS).map((value) => (
                <option key={value} value={value}>
                  {PAYMENT_STATUS_LABELS[value]}
                </option>
              ))}
            </NativeSelect>
          </label>
          <label className="text-sm">
            Carrier
            <input
              value={form.carrier}
              onChange={(e) => setField("carrier", e.target.value)}
              className={`mt-1.5 ${INPUT}`}
            />
          </label>
          <label className="text-sm">
            Tracking number
            <input
              value={form.trackingNumber}
              onChange={(e) => setField("trackingNumber", e.target.value)}
              className={`mt-1.5 ${INPUT}`}
            />
          </label>
          <label className="text-sm sm:col-span-2">
            Tracking URL
            <input
              value={form.trackingUrl}
              onChange={(e) => setField("trackingUrl", e.target.value)}
              className={`mt-1.5 ${INPUT}`}
            />
          </label>
        </div>
        <div className="mt-5">
          <OrderTimeline status={form.orderStatus} />
        </div>
      </section>

      {mode === "edit" ? (
        <section className="rounded-2xl border border-border bg-white p-5">
          <h2 className="font-semibold">Customer notifications</h2>
          <ul className="mt-4 space-y-2 text-sm">
            {notifications.length ? (
              notifications.map((note) => (
                <li
                  key={note.id}
                  className="flex flex-wrap justify-between gap-2 border-b border-border/70 py-2 last:border-0"
                >
                  <span>
                    {note.status === "sent" ? "✓" : note.status === "failed" ? "✕" : "•"}{" "}
                    {String(note.eventType).replaceAll("_", " ")} — {note.channel}
                  </span>
                  <span className="text-muted-foreground capitalize">
                    {note.status}
                    {note.error ? ` · ${note.error}` : ""}
                  </span>
                </li>
              ))
            ) : (
              <li className="text-muted-foreground">No notifications recorded yet.</li>
            )}
          </ul>
        </section>
      ) : null}

      <div className="flex justify-end">
        <Button
          type="submit"
          disabled={saving}
          className="h-11 rounded-full bg-teal px-8 text-xs tracking-[0.1em] text-teal-foreground uppercase"
        >
          {saving ? <Loader2 className="size-4 animate-spin" /> : null}
          {mode === "create" ? "Create order" : "Save changes"}
        </Button>
      </div>
    </form>
  );
}
