"use client";

import Link from "next/link";

import { ProductImage } from "@/components/site/ProductImage";
import { Button } from "@/components/ui/button";
import { ORDER_STATUS_LABELS, PAYMENT_STATUS_LABELS } from "@/lib/commerce-constants";
import type { Order } from "@/lib/commerce-types";
import { formatOrderDate, isTrackableStatus, orderItemCount } from "@/lib/order-tracking";
import { formatInr } from "@/lib/price";

export function OrderListCard({ order }: { order: Order }) {
  const first = order.items[0];
  const extra = order.items.length > 1 ? ` +${order.items.length - 1} more` : "";
  const qty = orderItemCount(order);
  const trackable = isTrackableStatus(order.orderStatus);
  const href = `/account/orders/${encodeURIComponent(order.orderNumber)}`;

  return (
    <article className="rounded-3xl border border-border p-5">
      <div className="flex gap-4">
        {first?.productImage ? (
          <ProductImage
            src={first.productImage}
            alt=""
            width={160}
            height={160}
            sizes="80px"
            className="size-20 shrink-0 rounded-2xl object-cover object-top"
          />
        ) : null}
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div className="min-w-0">
              <p className="break-all font-display text-xl font-bold">#{order.orderNumber}</p>
              <p className="mt-1 text-sm text-muted-foreground">
                {formatOrderDate(order.createdAt)}
              </p>
              <p className="mt-2 text-sm">
                {first?.productName ?? "Order"}
                {extra}
              </p>
              <p className="mt-1 text-xs text-muted-foreground">
                Qty {qty} · {formatInr(order.totalAmount)}
              </p>
            </div>
            <div className="text-right">
              <p className="text-sm font-semibold text-teal">
                {ORDER_STATUS_LABELS[order.orderStatus] ?? order.orderStatus}
              </p>
              <p className="mt-1 text-xs text-muted-foreground">
                {PAYMENT_STATUS_LABELS[order.paymentStatus] ?? order.paymentStatus}
              </p>
              {order.expectedDelivery ? (
                <p className="mt-2 text-xs text-muted-foreground">{order.expectedDelivery}</p>
              ) : null}
            </div>
          </div>
          <div className="mt-4 flex flex-wrap gap-2">
            <Button
              asChild
              variant="outline"
              className="h-10 rounded-full px-5 text-xs font-semibold tracking-[0.12em] uppercase"
            >
              <Link href={href}>View Order</Link>
            </Button>
            {trackable ? (
              <Button
                asChild
                className="h-10 rounded-full bg-teal px-5 text-xs font-semibold tracking-[0.12em] text-teal-foreground uppercase"
              >
                <Link href={href}>Track Order</Link>
              </Button>
            ) : null}
          </div>
        </div>
      </div>
    </article>
  );
}
