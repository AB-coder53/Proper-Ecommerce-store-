"use client";

import Link from "next/link";
import { useEffect } from "react";
import { Loader2 } from "lucide-react";

import { OrderListCard } from "@/components/commerce/OrderListCard";
import { useCommerce } from "@/components/commerce/CommerceProvider";
import { Button } from "@/components/ui/button";
import { useLiveOrders } from "@/hooks/use-live-orders";

export default function AccountOrdersPage() {
  const { customer, loading, openAuth } = useCommerce();
  const { orders, ready } = useLiveOrders(Boolean(customer));

  useEffect(() => {
    if (!loading && !customer) openAuth({ type: "generic", redirect: "/account/orders" });
  }, [customer, loading, openAuth]);

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
      <p className="mt-2 text-sm text-muted-foreground">
        Status updates automatically when we process, ship, or deliver your order.
      </p>

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
