"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { Loader2 } from "lucide-react";

import { OrderListCard } from "@/components/commerce/OrderListCard";
import { useCommerce } from "@/components/commerce/CommerceProvider";
import { Button } from "@/components/ui/button";
import type { Order } from "@/lib/commerce-types";

export default function AccountOrdersPage() {
  const { customer, loading, openAuth } = useCommerce();
  const [orders, setOrders] = useState<Order[]>([]);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    if (!loading && !customer) openAuth({ type: "generic", redirect: "/account/orders" });
  }, [customer, loading, openAuth]);

  useEffect(() => {
    if (!customer) return;
    void (async () => {
      const res = await fetch("/api/orders");
      if (res.ok) {
        const data = (await res.json()) as { orders: Order[] };
        setOrders(data.orders);
      }
      setReady(true);
    })();
  }, [customer]);

  if (loading || !customer) {
    return (
      <div className="flex min-h-[40vh] items-center justify-center">
        <Loader2 className="size-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-3xl px-5 py-12 sm:px-8 sm:py-16">
      <p className="eyebrow">Account</p>
      <h1 className="mt-3 font-display text-[2.15rem] font-bold tracking-tight sm:text-5xl">
        My Orders
      </h1>

      {!ready ? (
        <div className="flex min-h-[20vh] items-center justify-center">
          <Loader2 className="size-6 animate-spin text-muted-foreground" />
        </div>
      ) : !orders.length ? (
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
            <OrderListCard key={order.id} order={order} />
          ))}
        </div>
      )}
    </div>
  );
}
