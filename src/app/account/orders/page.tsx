"use client";

import Link from "next/link";
import { useEffect, useState } from "react";

import { useCommerce } from "@/components/commerce/CommerceProvider";
import { Button } from "@/components/ui/button";
import { ORDER_STATUS_LABELS } from "@/lib/commerce-constants";
import type { Order } from "@/lib/commerce-types";
import { formatInr } from "@/lib/price";

export default function AccountOrdersPage() {
  const { customer, loading, openAuth } = useCommerce();
  const [orders, setOrders] = useState<Order[]>([]);

  useEffect(() => {
    if (!loading && !customer) openAuth({ type: "generic", redirect: "/account/orders" });
  }, [customer, loading, openAuth]);

  useEffect(() => {
    if (!customer) return;
    void (async () => {
      const res = await fetch("/api/orders");
      if (!res.ok) return;
      const data = (await res.json()) as { orders: Order[] };
      setOrders(data.orders);
    })();
  }, [customer]);

  if (!customer) return <div className="min-h-[40vh]" />;

  return (
    <div className="mx-auto max-w-3xl px-5 py-12 sm:px-8 sm:py-16">
      <p className="eyebrow">Account</p>
      <h1 className="mt-3 font-display text-[2.15rem] font-bold tracking-tight sm:text-5xl">
        My Orders
      </h1>

      {!orders.length ? (
        <div className="mt-10 rounded-3xl border border-border bg-sand p-8 text-center">
          <p className="text-sm text-muted-foreground">You haven&apos;t placed an order yet.</p>
          <Button
            asChild
            className="mt-6 h-11 rounded-full bg-teal px-8 text-xs tracking-[0.12em] text-teal-foreground uppercase"
          >
            <Link href="/collection">Shop Collection</Link>
          </Button>
        </div>
      ) : (
        <div className="mt-8 space-y-4">
          {orders.map((order) => (
            <Link
              key={order.id}
              href={`/account/orders/${encodeURIComponent(order.orderNumber)}`}
              className="block rounded-3xl border border-border p-5 transition-colors hover:border-foreground"
            >
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div>
                  <p className="font-display text-xl font-bold">#{order.orderNumber}</p>
                  <p className="mt-1 text-sm text-muted-foreground">
                    {order.items[0]?.productName}
                    {order.items.length > 1 ? ` +${order.items.length - 1} more` : ""}
                  </p>
                </div>
                <div className="text-right">
                  <p className="font-semibold text-teal">{formatInr(order.totalAmount)}</p>
                  <p className="mt-1 text-xs tracking-[0.1em] text-muted-foreground uppercase">
                    {ORDER_STATUS_LABELS[order.orderStatus] ?? order.orderStatus}
                  </p>
                </div>
              </div>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
