"use client";

import Link from "next/link";
import { Suspense, useEffect } from "react";
import { useSearchParams } from "next/navigation";
import { Check } from "lucide-react";

import { useCommerce } from "@/components/commerce/CommerceProvider";
import { Button } from "@/components/ui/button";

function SuccessInner() {
  const params = useSearchParams();
  const orderNumber = params.get("order") || "";
  const { closeCart } = useCommerce();

  useEffect(() => {
    closeCart();
  }, [closeCart]);

  return (
    <div className="mx-auto max-w-lg px-5 py-20 text-center sm:px-8">
      <div className="mx-auto flex size-16 items-center justify-center rounded-full bg-teal text-teal-foreground">
        <Check className="size-7" strokeWidth={1.75} />
      </div>
      <h1 className="mt-8 font-display text-[clamp(1.75rem,8vw,3rem)] font-bold tracking-tight sm:text-5xl">
        Order Successfully Placed!
      </h1>
      {orderNumber ? (
        <p className="mt-6 min-w-0 text-sm text-muted-foreground">
          Order ID
          <span className="mt-2 block break-all font-display text-2xl font-bold tracking-wide text-foreground sm:text-3xl">
            #{orderNumber}
          </span>
        </p>
      ) : null}
      <p className="mt-5 text-sm leading-relaxed text-muted-foreground">
        Thank you for your order. Payment is still pending confirmation — no charge was taken on the
        checkout page. We&apos;ll confirm payment details and keep you updated as your order moves
        through packing and shipping.
      </p>
      <div className="mt-8 flex flex-col gap-3 sm:flex-row sm:justify-center">
        <Button
          asChild
          className="h-12 rounded-full bg-teal px-8 text-xs tracking-[0.12em] text-teal-foreground uppercase"
        >
          <Link
            href={
              orderNumber ? `/account/orders/${encodeURIComponent(orderNumber)}` : "/account/orders"
            }
          >
            View Order
          </Link>
        </Button>
        <Button
          asChild
          variant="outline"
          className="h-12 rounded-full border-foreground px-8 text-xs tracking-[0.12em] uppercase"
        >
          <Link href="/track-order">Track Your Order</Link>
        </Button>
      </div>
    </div>
  );
}

export default function CheckoutSuccessPage() {
  return (
    <Suspense fallback={<div className="min-h-[40vh]" />}>
      <SuccessInner />
    </Suspense>
  );
}
