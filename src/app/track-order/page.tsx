"use client";

import { useState, type FormEvent } from "react";
import { Loader2 } from "lucide-react";

import { OrderTimeline } from "@/components/commerce/OrderTimeline";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { ORDER_STATUS_LABELS, PAYMENT_STATUS_LABELS } from "@/lib/commerce-constants";
import type { Order } from "@/lib/commerce-types";
import { formatInr } from "@/lib/price";

export default function TrackOrderPage() {
  const [orderNumber, setOrderNumber] = useState("");
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [order, setOrder] = useState<Order | null>(null);

  const submit = async (event: FormEvent) => {
    event.preventDefault();
    setLoading(true);
    setError("");
    setOrder(null);
    try {
      const res = await fetch("/api/orders/track", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ orderNumber, email }),
      });
      const data = (await res.json()) as { order?: Order; error?: string };
      if (!res.ok || !data.order) {
        setError(data.error || "No order found for that Order ID and email.");
        return;
      }
      setOrder(data.order);
    } catch {
      setError("Something went wrong. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="mx-auto max-w-2xl px-5 py-12 sm:px-8 sm:py-16">
      <p className="eyebrow">Support</p>
      <h1 className="mt-3 font-display text-[2.15rem] font-bold tracking-tight sm:text-5xl">
        Track Your Order
      </h1>
      <p className="mt-4 text-sm text-muted-foreground">
        Enter your Order ID and the email used at checkout. We only show orders that match both.
      </p>

      <form onSubmit={submit} className="mt-8 space-y-4 rounded-3xl border border-border p-6">
        <div>
          <Label htmlFor="orderId">Order ID</Label>
          <Input
            id="orderId"
            value={orderNumber}
            onChange={(e) => setOrderNumber(e.target.value)}
            placeholder="ABO-260812-XXXX"
            required
            className="mt-1.5 h-11 rounded-full"
          />
        </div>
        <div>
          <Label htmlFor="email">Email</Label>
          <Input
            id="email"
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
            className="mt-1.5 h-11 rounded-full"
          />
        </div>
        {error ? <p className="text-sm text-destructive">{error}</p> : null}
        <Button
          type="submit"
          disabled={loading}
          className="h-11 w-full rounded-full bg-teal text-xs tracking-[0.12em] text-teal-foreground uppercase"
        >
          {loading ? <Loader2 className="size-4 animate-spin" /> : "Track Order"}
        </Button>
      </form>

      {order ? (
        <div className="mt-8 space-y-6 rounded-3xl border border-border p-6">
          <div>
            <h2 className="font-display text-2xl font-bold">Order #{order.orderNumber}</h2>
            <p className="mt-2 text-sm text-teal">
              Current Status: {ORDER_STATUS_LABELS[order.orderStatus] ?? order.orderStatus}
            </p>
            <p className="mt-1 text-sm text-muted-foreground">
              Payment: {PAYMENT_STATUS_LABELS[order.paymentStatus] ?? order.paymentStatus}
            </p>
          </div>
          <OrderTimeline status={order.orderStatus} />
          <div>
            <h3 className="font-semibold">Items</h3>
            <ul className="mt-3 space-y-2 text-sm">
              {order.items.map((item) => (
                <li key={item.id} className="flex justify-between gap-3">
                  <span>
                    {item.productName} · {item.color} · {item.size} × {item.quantity}
                  </span>
                  <span className="font-medium text-teal">{formatInr(item.lineTotal)}</span>
                </li>
              ))}
            </ul>
            <p className="mt-4 text-right text-sm font-bold">
              Total {formatInr(order.totalAmount)}
            </p>
          </div>
        </div>
      ) : null}
    </div>
  );
}
