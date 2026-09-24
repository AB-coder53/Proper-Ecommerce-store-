"use client";

import Link from "next/link";
import { useEffect } from "react";
import { useParams } from "next/navigation";

import { OrderTimeline } from "@/components/commerce/OrderTimeline";
import { useCommerce } from "@/components/commerce/CommerceProvider";
import { ProductImage } from "@/components/site/ProductImage";
import { Button } from "@/components/ui/button";
import { useLiveOrder } from "@/hooks/use-live-orders";
import { ORDER_STATUS_LABELS, PAYMENT_STATUS_LABELS } from "@/lib/commerce-constants";
import { formatInr } from "@/lib/price";

export default function AccountOrderDetailPage() {
  const params = useParams<{ id: string }>();
  const { customer, loading, openAuth } = useCommerce();
  const { order, error } = useLiveOrder(customer ? params.id : undefined);

  useEffect(() => {
    if (!loading && !customer) {
      openAuth({ type: "generic", redirect: `/account/orders/${params.id}` });
    }
  }, [customer, loading, openAuth, params.id]);

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
      <h1 className="mt-4 min-w-0 break-all font-display text-[clamp(1.75rem,7vw,2.15rem)] font-bold tracking-tight sm:text-4xl">
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
          <p className="mt-1 text-xs text-muted-foreground">Updates automatically.</p>
          {order.expectedDelivery ? (
            <p className="mt-2 text-sm text-muted-foreground">{order.expectedDelivery}</p>
          ) : null}
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
                <ProductImage
                  src={item.productImage}
                  alt=""
                  width={128}
                  height={128}
                  sizes="64px"
                  className="size-16 shrink-0 rounded-xl object-cover object-top"
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
        <div className="mt-5 space-y-2 border-t border-border pt-4 text-sm">
          <div className="flex justify-between">
            <span className="text-muted-foreground">Subtotal</span>
            <span>{formatInr(order.subtotal)}</span>
          </div>
          {order.discount > 0 ? (
            <div className="flex justify-between text-teal">
              <span>Discount</span>
              <span>-{formatInr(order.discount)}</span>
            </div>
          ) : null}
          <div className="flex justify-between">
            <span className="text-muted-foreground">Shipping</span>
            <span>{order.shippingCost > 0 ? formatInr(order.shippingCost) : "Free"}</span>
          </div>
          <div className="flex justify-between font-bold">
            <span>Total</span>
            <span className="text-teal">{formatInr(order.totalAmount)}</span>
          </div>
        </div>
      </section>
    </div>
  );
}
