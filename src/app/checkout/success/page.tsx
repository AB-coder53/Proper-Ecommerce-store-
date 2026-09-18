"use client";

import Link from "next/link";
import { Suspense } from "react";
import { useSearchParams } from "next/navigation";
import { Check } from "lucide-react";

import { Button } from "@/components/ui/button";

function SuccessInner() {
  const params = useSearchParams();
  const orderNumber = params.get("order") || "";

  return (
    <div className="mx-auto max-w-lg px-5 py-20 text-center sm:px-8">
      <div className="mx-auto flex size-16 items-center justify-center rounded-full bg-teal text-teal-foreground">
        <Check className="size-7" strokeWidth={1.75} />
      </div>
      <h1 className="mt-8 font-display text-4xl font-bold tracking-tight sm:text-5xl">
        Order Successfully Placed!
      </h1>
      {orderNumber ? (
        <p className="mt-6 text-sm text-muted-foreground">
          Order ID
          <span className="mt-2 block font-display text-3xl font-bold tracking-wide text-foreground">
            #{orderNumber}
          </span>
        </p>
      ) : null}
      <p className="mt-5 text-sm leading-relaxed text-muted-foreground">
        Thank you for your order. We&apos;ll confirm payment details and keep you updated as your
        order moves through packing and shipping.
      </p>
      <div className="mt-8 flex flex-col gap-3 sm:flex-row sm:justify-center">
        <Button
          asChild
          className="h-11 rounded-full bg-teal px-8 text-xs tracking-[0.12em] text-teal-foreground uppercase"
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
          className="h-11 rounded-full border-foreground px-8 text-xs tracking-[0.12em] uppercase"
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
