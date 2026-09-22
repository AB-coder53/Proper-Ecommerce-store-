"use client";

import Link from "next/link";
import { useCallback, useEffect, useRef, useState } from "react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import {
  ORDER_STATUS_LABELS,
  ORDER_STATUSES,
  PAYMENT_STATUS_LABELS,
} from "@/lib/commerce-constants";
import type { Order } from "@/lib/commerce-types";
import { formatInr } from "@/lib/price";

const EXTRA = ["cancelled", "failed", "returned"] as const;
const QUICK_STATUSES = ["processing", "shipped", "delivered"] as const;
const POLL_MS = 8000;

export function AdminOrdersTable({ initialOrders }: { initialOrders: Order[] }) {
  const [orders, setOrders] = useState(initialOrders);
  const [busyId, setBusyId] = useState<string | null>(null);
  const busyRef = useRef<string | null>(null);
  busyRef.current = busyId;

  const refresh = useCallback(async () => {
    if (busyRef.current) return;
    const res = await fetch("/api/admin/orders", { cache: "no-store" });
    if (!res.ok) return;
    const data = (await res.json()) as { orders?: Order[] };
    if (data.orders) setOrders(data.orders);
  }, []);

  useEffect(() => {
    const timer = window.setInterval(() => void refresh(), POLL_MS);
    const onFocus = () => {
      if (document.visibilityState === "visible") void refresh();
    };
    window.addEventListener("focus", onFocus);
    document.addEventListener("visibilitychange", onFocus);
    return () => {
      window.clearInterval(timer);
      window.removeEventListener("focus", onFocus);
      document.removeEventListener("visibilitychange", onFocus);
    };
  }, [refresh]);

  const updateStatus = async (order: Order, orderStatus: string) => {
    if (orderStatus === order.orderStatus) return;
    setBusyId(order.id);
    try {
      const res = await fetch(`/api/admin/orders/${order.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          orderStatus,
          paymentStatus: order.paymentStatus,
          trackingNumber: order.trackingNumber ?? "",
          carrier: order.carrier ?? "",
          trackingUrl: order.trackingUrl ?? "",
        }),
      });
      const data = (await res.json()) as { order?: Order; error?: string };
      if (!res.ok || !data.order) {
        toast.error(data.error || "Could not update order status.");
        return;
      }
      setOrders((current) => current.map((row) => (row.id === data.order!.id ? data.order! : row)));
      toast.success(
        `Order #${data.order.orderNumber} is now ${ORDER_STATUS_LABELS[data.order.orderStatus] ?? data.order.orderStatus}. Customers see this immediately.`,
      );
    } catch {
      toast.error("Could not update order status.");
    } finally {
      setBusyId(null);
    }
  };

  return (
    <div className="mt-8 overflow-x-auto rounded-2xl border border-border bg-white">
      <table className="min-w-full text-left text-sm">
        <thead className="border-b border-border bg-muted/40 text-xs tracking-[0.08em] text-muted-foreground uppercase">
          <tr>
            <th className="px-4 py-3">Order</th>
            <th className="px-4 py-3">Customer</th>
            <th className="px-4 py-3">Items</th>
            <th className="px-4 py-3">Total</th>
            <th className="px-4 py-3">Payment</th>
            <th className="px-4 py-3">Status</th>
            <th className="px-4 py-3">Date</th>
          </tr>
        </thead>
        <tbody>
          {orders.map((order) => (
            <tr key={order.id} className="border-b border-border last:border-0">
              <td className="px-4 py-3">
                <Link
                  href={`/admin/orders/${order.id}`}
                  className="font-medium text-teal hover:underline"
                >
                  #{order.orderNumber}
                </Link>
              </td>
              <td className="px-4 py-3">
                <div className="font-medium">{order.customerName}</div>
                <div className="break-all text-xs text-muted-foreground">{order.customerEmail}</div>
                <div className="text-xs text-muted-foreground">{order.customerPhone}</div>
              </td>
              <td className="px-4 py-3">
                {order.items.length
                  ? `${order.items.reduce((sum, item) => sum + item.quantity, 0)} pcs`
                  : "—"}
              </td>
              <td className="px-4 py-3 font-semibold">{formatInr(order.totalAmount)}</td>
              <td className="px-4 py-3">
                {PAYMENT_STATUS_LABELS[order.paymentStatus] ?? order.paymentStatus}
              </td>
              <td className="px-4 py-3">
                <select
                  value={order.orderStatus}
                  disabled={busyId === order.id}
                  aria-label={`Update status for order ${order.orderNumber}`}
                  onChange={(event) => void updateStatus(order, event.target.value)}
                  className="h-11 min-w-[11rem] rounded-full border border-border bg-background px-3"
                >
                  {[...ORDER_STATUSES, ...EXTRA].map((value) => (
                    <option key={value} value={value}>
                      {ORDER_STATUS_LABELS[value] ?? value}
                    </option>
                  ))}
                </select>
                <div className="mt-2 flex flex-wrap gap-1">
                  {QUICK_STATUSES.map((value) => (
                    <button
                      key={value}
                      type="button"
                      disabled={busyId === order.id || order.orderStatus === value}
                      onClick={() => void updateStatus(order, value)}
                      className="h-8 rounded-full border border-border px-2.5 text-[10px] tracking-[0.08em] uppercase disabled:opacity-50"
                    >
                      {ORDER_STATUS_LABELS[value]}
                    </button>
                  ))}
                </div>
              </td>
              <td className="px-4 py-3 text-muted-foreground">
                {new Date(order.createdAt).toLocaleString("en-IN")}
              </td>
            </tr>
          ))}
          {!orders.length ? (
            <tr>
              <td colSpan={7} className="px-4 py-10 text-center text-muted-foreground">
                No orders yet.
              </td>
            </tr>
          ) : null}
        </tbody>
      </table>
      <div className="border-t border-border px-4 py-3 text-xs text-muted-foreground">
        Changing status here updates the customer account and tracking page within a few seconds.
        <Button asChild variant="ghost" className="ml-2 h-8 rounded-full px-3 text-xs">
          <Link href="/admin/orders">Refresh list</Link>
        </Button>
      </div>
    </div>
  );
}
