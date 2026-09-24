"use client";

import { useState, type FormEvent } from "react";
import { Loader2 } from "lucide-react";

import { OrderListCard } from "@/components/commerce/OrderListCard";
import { OrderTimeline } from "@/components/commerce/OrderTimeline";
import { useCommerce } from "@/components/commerce/CommerceProvider";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useLiveGuestTracking, useLiveOrders } from "@/hooks/use-live-orders";
import { ORDER_STATUS_LABELS } from "@/lib/commerce-constants";
import { apiErrorMessage, readJsonBody } from "@/lib/form-request";
import { formatOrderDate, type GuestOrderTracking } from "@/lib/order-tracking";

export default function TrackOrderPage() {
  const { customer, loading, openAuth } = useCommerce();
  const { orders, ready: ordersReady } = useLiveOrders(Boolean(customer));
  const { tracking, setTracking } = useLiveGuestTracking(!customer);
  const [orderNumber, setOrderNumber] = useState("");
  const [phoneLast4, setPhoneLast4] = useState("");
  const [step, setStep] = useState<"number" | "verify">("number");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");

  const requestCode = async (event: FormEvent) => {
    event.preventDefault();
    if (submitting) return;
    setSubmitting(true);
    setError("");
    setTracking(null);
    try {
      const res = await fetch("/api/orders/track/request", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ orderNumber }),
      });
      const data = await readJsonBody<{ ok?: boolean; error?: string }>(res);
      if (!res.ok || !data.ok) {
        setError(apiErrorMessage(data, "Please check your order number and try again."));
        return;
      }
      setStep("verify");
    } catch {
      setError("Something went wrong. Please try again.");
    } finally {
      setSubmitting(false);
    }
  };

  const verify = async (event: FormEvent) => {
    event.preventDefault();
    if (submitting) return;
    setSubmitting(true);
    setError("");
    try {
      const res = await fetch("/api/orders/track/verify", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ orderNumber, phoneLast4 }),
      });
      const data = await readJsonBody<{ tracking?: GuestOrderTracking; error?: string }>(res);
      if (!res.ok || !data.tracking) {
        setError(apiErrorMessage(data, "Verification failed. Please try again."));
        return;
      }
      setTracking(data.tracking);
    } catch {
      setError("Something went wrong. Please try again.");
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="flex min-h-[40vh] items-center justify-center">
        <Loader2 className="size-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (customer) {
    return (
      <div className="mx-auto max-w-3xl px-5 py-12 sm:px-8 sm:py-16">
        <p className="eyebrow">Account</p>
        <h1 className="mt-3 font-display text-[2.15rem] font-bold tracking-tight sm:text-5xl">
          Track Your Orders
        </h1>
        <p className="mt-4 text-sm text-muted-foreground">
          Signed in as <span className="break-all">{customer.email}</span>. Status updates
          automatically as we process, ship, or deliver your order.
        </p>
        {!ordersReady ? (
          <div className="flex min-h-[20vh] items-center justify-center">
            <Loader2 className="size-6 animate-spin text-muted-foreground" />
          </div>
        ) : !orders.length ? (
          <p className="mt-10 text-sm text-muted-foreground">
            You haven&apos;t placed an order yet.
          </p>
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

  return (
    <div className="mx-auto max-w-2xl px-5 py-12 sm:px-8 sm:py-16">
      <p className="eyebrow">Support</p>
      <h1 className="mt-3 font-display text-[2.15rem] font-bold tracking-tight sm:text-5xl">
        Track Your Order
      </h1>
      <p className="mt-4 text-sm text-muted-foreground">
        Enter your Order ID, then verify with the last 4 digits of the phone number used at
        checkout. An order number alone cannot show tracking details.
      </p>
      <p className="mt-3 text-sm text-muted-foreground">
        Have an account?{" "}
        <button
          type="button"
          className="font-medium text-teal underline-offset-4 hover:underline"
          onClick={() => openAuth({ type: "generic", redirect: "/track-order" })}
        >
          Log in to view all orders
        </button>
      </p>

      {step === "number" ? (
        <form
          onSubmit={requestCode}
          className="mt-8 space-y-4 rounded-3xl border border-border p-6"
        >
          <div>
            <Label htmlFor="orderId">Order ID</Label>
            <Input
              id="orderId"
              value={orderNumber}
              onChange={(e) => setOrderNumber(e.target.value)}
              placeholder="ABO-260812-XXXX"
              required
              autoComplete="off"
              className="mt-1.5 h-11 rounded-full"
            />
          </div>
          {error ? (
            <p className="text-sm text-destructive" role="alert">
              {error}
            </p>
          ) : null}
          <Button
            type="submit"
            disabled={submitting}
            className="h-11 w-full rounded-full bg-teal text-xs tracking-[0.12em] text-teal-foreground uppercase"
          >
            {submitting ? <Loader2 className="size-4 animate-spin" /> : "Continue"}
          </Button>
        </form>
      ) : (
        <form onSubmit={verify} className="mt-8 space-y-4 rounded-3xl border border-border p-6">
          <p className="text-sm text-muted-foreground">
            Verification for{" "}
            <span className="font-medium text-foreground">{orderNumber.trim()}</span>
          </p>
          <div>
            <Label htmlFor="phoneLast4">Last 4 digits of checkout phone</Label>
            <Input
              id="phoneLast4"
              value={phoneLast4}
              onChange={(e) => setPhoneLast4(e.target.value.replace(/\D/g, "").slice(0, 4))}
              inputMode="numeric"
              autoComplete="off"
              required
              minLength={4}
              maxLength={4}
              className="mt-1.5 h-11 rounded-full"
            />
          </div>
          {error ? (
            <p className="text-sm text-destructive" role="alert">
              {error}
            </p>
          ) : null}
          <Button
            type="submit"
            disabled={submitting || phoneLast4.length !== 4}
            className="h-11 w-full rounded-full bg-teal text-xs tracking-[0.12em] text-teal-foreground uppercase"
          >
            {submitting ? <Loader2 className="size-4 animate-spin" /> : "Verify & Track"}
          </Button>
          <button
            type="button"
            className="w-full text-center text-xs text-muted-foreground underline-offset-4 hover:underline"
            onClick={() => {
              setStep("number");
              setPhoneLast4("");
              setError("");
              setTracking(null);
            }}
          >
            Use a different order number
          </button>
        </form>
      )}

      {tracking ? (
        <div className="mt-8 space-y-6 rounded-3xl border border-border p-6">
          <div>
            <h2 className="font-display text-2xl font-bold">Order #{tracking.orderNumber}</h2>
            <p className="mt-2 text-sm text-muted-foreground">
              {formatOrderDate(tracking.createdAt)}
            </p>
            <p className="mt-2 text-sm text-teal">
              Status: {ORDER_STATUS_LABELS[tracking.orderStatus] ?? tracking.orderStatus}
            </p>
            <p className="mt-1 text-xs text-muted-foreground">Updates automatically.</p>
            {tracking.expectedDelivery ? (
              <p className="mt-1 text-sm text-muted-foreground">{tracking.expectedDelivery}</p>
            ) : null}
            {tracking.destination ? (
              <p className="mt-1 text-sm text-muted-foreground">{tracking.destination}</p>
            ) : null}
          </div>
          <OrderTimeline status={tracking.orderStatus} />
          <div>
            <h3 className="font-semibold">Items</h3>
            <ul className="mt-3 space-y-3 text-sm">
              {tracking.items.map((item, index) => (
                <li key={`${item.productName}-${index}`} className="flex gap-3">
                  {item.productImage ? (
                    <img
                      src={item.productImage}
                      alt=""
                      className="size-14 rounded-xl object-cover object-top"
                    />
                  ) : null}
                  <div>
                    <p className="font-medium">{item.productName}</p>
                    <p className="text-muted-foreground">
                      {item.color} · {item.size} · Qty {item.quantity}
                    </p>
                  </div>
                </li>
              ))}
            </ul>
          </div>
        </div>
      ) : null}
    </div>
  );
}
