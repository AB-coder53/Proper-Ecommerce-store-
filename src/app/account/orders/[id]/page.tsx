"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { useParams } from "next/navigation";

import { OrderTimeline } from "@/components/commerce/OrderTimeline";
import { useCommerce } from "@/components/commerce/CommerceProvider";
import { Button } from "@/components/ui/button";
import { ORDER_STATUS_LABELS, PAYMENT_STATUS_LABELS } from "@/lib/commerce-constants";
import type { Order } from "@/lib/commerce-types";
import { formatInr } from "@/lib/price";

export default function AccountOrderDetailPage() {
  const params = useParams<{ id: string }>();
  const { customer, loading, openAuth } = useCommerce();
  const [order, setOrder] = useState<Order | null>(null);
  const [error, setError] = useState("");

  useEffect(() => {
    if (!loading && !customer) {
      openAuth({ type: "generic", redirect: `/account/orders/${params.id}` });
    }
  }, [customer, loading, openAuth, params.id]);

  useEffect(() => {
    if (!customer || !params.id) return;
    void (async () => {
      const res = await fetch(`/api/orders/${encodeURIComponent(params.id)}`);
      const data = (await res.json()) as { order?: Order; error?: string };
      if (!res.ok || !data.order) {
        setError(data.error || "Order not found.");
        return;
      }
      setOrder(data.order);
    })();
  }, [customer, params.id]);

  if (!customer) return <div className="min-h-[40vh]" />;

  if (error) {
    return (
      <div className="mx-auto max-w-lg px-5 py-20 text-center">
        <p className="text-sm text-destructive">{error}</p>
        <Button
          asChild
          className="mt-6 h-11 rounded-full bg-teal px-8 text-xs tracking-[0.12em] text-teal-foreground uppercase"
        >
          <Link href="/account/orders">Back to orders</Link>
        </Button>
      </div>
    );
  }

  if (!order) return <div className="min-h-[40vh]" />;

  return (
    <div className="mx-auto max-w-3xl px-5 py-12 sm:px-8 sm:py-16">
      <Link href="/account/orders" className="text-sm text-muted-foreground hover:text-foreground">
        ← My Orders
      </Link>
      <h1 className="mt-4 font-display text-[2.15rem] font-bold tracking-tight sm:text-4xl">
        Order #{order.orderNumber}
      </h1>
      <p className="mt-2 text-sm text-muted-foreground">
        Placed {new Date(order.createdAt).toLocaleString("en-IN")}
      </p>

      <div className="mt-8 grid gap-8 lg:grid-cols-2">
        <section className="rounded-3xl border border-border p-5">
          <h2 className="font-semibold">Status</h2>
          <p className="mt-2 text-sm text-teal">
            Current: {ORDER_STATUS_LABELS[order.orderStatus] ?? order.orderStatus}
          </p>
          <p className="mt-1 text-sm text-muted-foreground">
            Payment: {PAYMENT_STATUS_LABELS[order.paymentStatus] ?? order.paymentStatus}
          </p>
          <div className="mt-5">
            <OrderTimeline status={order.orderStatus} />
          </div>
        </section>

        <section className="rounded-3xl border border-border p-5">
          <h2 className="font-semibold">Delivery</h2>
          <p className="mt-3 text-sm">
            {order.customerName}
            <br />
            {order.customerPhone}
            {order.alternatePhone ? ` · Alt ${order.alternatePhone}` : ""}
            <br />
            {order.addressLine1}
            {order.addressLine2 ? `, ${order.addressLine2}` : ""}
            <br />
            {order.addressCity}, {order.addressState} {order.addressPincode}
          </p>
        </section>
      </div>

      <section className="mt-8 rounded-3xl border border-border p-5">
        <h2 className="font-semibold">Items</h2>
        <ul className="mt-4 space-y-4">
          {order.items.map((item) => (
            <li key={item.id} className="flex gap-3 text-sm">
              {item.productImage ? (
                <img
                  src={item.productImage}
                  alt=""
                  className="size-16 rounded-xl object-cover object-top"
                />
              ) : null}
              <div className="min-w-0 flex-1">
                <p className="font-medium">{item.productName}</p>
                <p className="text-muted-foreground">
                  {item.color} · {item.size} · Qty {item.quantity}
                </p>
                <p className="mt-1 font-semibold text-teal">{formatInr(item.lineTotal)}</p>
              </div>
            </li>
          ))}
        </ul>
        <div className="mt-5 flex justify-between border-t border-border pt-4 text-sm font-bold">
          <span>Total</span>
          <span className="text-teal">{formatInr(order.totalAmount)}</span>
        </div>
      </section>
    </div>
  );
}
