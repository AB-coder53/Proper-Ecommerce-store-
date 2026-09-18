"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { toast } from "sonner";

import { AdminShell } from "@/components/admin/AdminShell";
import { OrderTimeline } from "@/components/commerce/OrderTimeline";
import { Button } from "@/components/ui/button";
import {
  ORDER_STATUS_LABELS,
  ORDER_STATUSES,
  PAYMENT_STATUS_LABELS,
} from "@/lib/commerce-constants";
import type { Order } from "@/lib/commerce-types";
import { formatInr } from "@/lib/price";

const EXTRA = ["cancelled", "failed", "returned"] as const;

export default function AdminOrderDetailPage() {
  const params = useParams<{ id: string }>();
  const router = useRouter();
  const [order, setOrder] = useState<Order | null>(null);
  const [status, setStatus] = useState("");
  const [username, setUsername] = useState("Admin");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    void (async () => {
      const auth = await fetch("/api/admin/auth");
      const authData = (await auth.json()) as { authenticated?: boolean; username?: string };
      if (!authData.authenticated) {
        router.replace("/admin/login");
        return;
      }
      if (authData.username) setUsername(authData.username);

      const res = await fetch(`/api/admin/orders/${params.id}`);
      if (!res.ok) {
        toast.error("Order not found");
        router.replace("/admin/orders");
        return;
      }
      const data = (await res.json()) as { order: Order };
      setOrder(data.order);
      setStatus(data.order.orderStatus);
    })();
  }, [params.id, router]);

  const save = async () => {
    if (!order) return;
    setSaving(true);
    try {
      const res = await fetch(`/api/admin/orders/${order.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ orderStatus: status }),
      });
      const data = (await res.json()) as { order?: Order; error?: string };
      if (!res.ok || !data.order) {
        toast.error(data.error || "Could not update status");
        return;
      }
      setOrder(data.order);
      toast.success("Order status updated");
    } finally {
      setSaving(false);
    }
  };

  if (!order) {
    return (
      <AdminShell username={username}>
        <div className="min-h-[30vh]" />
      </AdminShell>
    );
  }

  return (
    <AdminShell username={username}>
      <Link href="/admin/orders" className="text-sm text-muted-foreground hover:text-foreground">
        ← Orders
      </Link>
      <h1 className="mt-3 font-display text-3xl font-bold">#{order.orderNumber}</h1>
      <p className="mt-1 text-sm text-muted-foreground">
        Updated {new Date(order.updatedAt).toLocaleString("en-IN")}
      </p>

      <div className="mt-8 grid gap-6 lg:grid-cols-2">
        <section className="rounded-2xl border border-border bg-white p-5">
          <h2 className="font-semibold">Customer</h2>
          <dl className="mt-3 space-y-2 text-sm">
            <div>
              <dt className="text-muted-foreground">Name</dt>
              <dd>{order.customerName}</dd>
            </div>
            <div>
              <dt className="text-muted-foreground">Email</dt>
              <dd className="break-all">{order.customerEmail}</dd>
            </div>
            <div>
              <dt className="text-muted-foreground">Phone</dt>
              <dd>{order.customerPhone}</dd>
            </div>
            <div>
              <dt className="text-muted-foreground">Alternate</dt>
              <dd>{order.alternatePhone || "—"}</dd>
            </div>
            <div>
              <dt className="text-muted-foreground">Address</dt>
              <dd>
                {order.addressLine1}
                {order.addressLine2 ? `, ${order.addressLine2}` : ""}
                <br />
                {order.addressCity}, {order.addressState} {order.addressPincode}
              </dd>
            </div>
          </dl>
        </section>

        <section className="rounded-2xl border border-border bg-white p-5">
          <h2 className="font-semibold">Status management</h2>
          <p className="mt-2 text-sm text-muted-foreground">
            Payment: {PAYMENT_STATUS_LABELS[order.paymentStatus]}
          </p>
          <label className="mt-4 block text-sm">
            Order status
            <select
              value={status}
              onChange={(e) => setStatus(e.target.value)}
              className="mt-1.5 w-full rounded-full border border-border bg-background px-4 py-2.5"
            >
              {[...ORDER_STATUSES, ...EXTRA].map((value) => (
                <option key={value} value={value}>
                  {ORDER_STATUS_LABELS[value] ?? value}
                </option>
              ))}
            </select>
          </label>
          <Button
            onClick={() => void save()}
            disabled={saving}
            className="mt-4 h-10 rounded-full bg-teal px-6 text-xs tracking-[0.1em] text-teal-foreground uppercase"
          >
            Update status
          </Button>
          <div className="mt-6">
            <OrderTimeline status={order.orderStatus} />
          </div>
        </section>
      </div>

      <section className="mt-6 rounded-2xl border border-border bg-white p-5">
        <h2 className="font-semibold">Products</h2>
        <div className="mt-4 overflow-x-auto">
          <table className="min-w-full text-left text-sm">
            <thead className="text-xs tracking-[0.08em] text-muted-foreground uppercase">
              <tr>
                <th className="py-2 pr-4">Product</th>
                <th className="py-2 pr-4">Variant</th>
                <th className="py-2 pr-4">Qty</th>
                <th className="py-2 pr-4">Unit</th>
                <th className="py-2">Line</th>
              </tr>
            </thead>
            <tbody>
              {order.items.map((item) => (
                <tr key={item.id} className="border-t border-border">
                  <td className="py-3 pr-4">
                    <div className="font-medium">{item.productName}</div>
                    <div className="text-xs text-muted-foreground">{item.productId}</div>
                  </td>
                  <td className="py-3 pr-4">
                    {item.color} / {item.size}
                  </td>
                  <td className="py-3 pr-4">{item.quantity}</td>
                  <td className="py-3 pr-4">{formatInr(item.unitPrice)}</td>
                  <td className="py-3 font-semibold">{formatInr(item.lineTotal)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <div className="mt-4 flex justify-end gap-8 text-sm">
          <span>Subtotal {formatInr(order.subtotal)}</span>
          <span>Shipping {formatInr(order.shippingCost)}</span>
          <span>Discount {formatInr(order.discount)}</span>
          <span className="font-bold text-teal">Total {formatInr(order.totalAmount)}</span>
        </div>
      </section>
    </AdminShell>
  );
}
