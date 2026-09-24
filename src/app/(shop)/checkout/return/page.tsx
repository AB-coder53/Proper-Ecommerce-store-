"use client";

import { Suspense, useEffect, useRef, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";

import { useCommerce } from "@/components/commerce/CommerceProvider";
import { OrderProcessingScreen } from "@/components/commerce/OrderProcessingScreen";
import { OrderPlaced } from "@/components/commerce/OrderPlaced";
import { BUY_NOW_KEY, CHECKOUT_DRAFT_KEY } from "@/lib/commerce-constants";
import type { CheckoutInput, Order } from "@/lib/commerce-types";
import { apiErrorMessage, readJsonBody } from "@/lib/form-request";

function ReturnInner() {
  const router = useRouter();
  const params = useSearchParams();
  const cashfreeOrderId = params.get("order_id") || "";
  const { applySuccessfulOrder } = useCommerce();
  const [error, setError] = useState("");
  const [confirmed, setConfirmed] = useState<{ orderNumber: string; paid: boolean } | null>(null);
  const started = useRef(false);

  useEffect(() => {
    if (started.current) return;
    started.current = true;
    void (async () => {
      try {
        const raw = sessionStorage.getItem(CHECKOUT_DRAFT_KEY);
        const draft = raw ? (JSON.parse(raw) as CheckoutInput) : null;
        if (!draft || !cashfreeOrderId) {
          setError("We could not find this checkout. Return to checkout and try again.");
          return;
        }
        const res = await fetch("/api/orders", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ ...draft, cashfreeOrderId }),
        });
        const data = await readJsonBody<{ order?: Order; error?: string }>(res);
        if (!res.ok || !data.order) {
          setError(
            apiErrorMessage(data, "Payment could not be confirmed. Your cart is unchanged."),
          );
          return;
        }
        sessionStorage.removeItem(CHECKOUT_DRAFT_KEY);
        sessionStorage.removeItem(BUY_NOW_KEY);
        setConfirmed({ orderNumber: data.order.orderNumber, paid: true });
        router.replace(
          `/checkout/success?order=${encodeURIComponent(data.order.orderNumber)}&paid=1`,
        );
        void applySuccessfulOrder(data.order, draft.mode === "buy_now" ? "buy_now" : "cart");
      } catch {
        setError("Something went wrong while confirming payment. Please try again.");
      }
    })();
  }, [applySuccessfulOrder, cashfreeOrderId, router]);

  if (confirmed) {
    return <OrderPlaced orderNumber={confirmed.orderNumber} paid={confirmed.paid} />;
  }

  if (error) {
    return (
      <div className="mx-auto max-w-lg px-5 py-20 text-center">
        <h1 className="font-display text-3xl font-bold">Payment not confirmed</h1>
        <p className="mt-4 text-sm text-destructive" role="alert">
          {error}
        </p>
        <a
          href="/checkout"
          className="mt-8 inline-flex h-12 items-center justify-center rounded-full bg-teal px-8 text-xs font-semibold tracking-[0.12em] text-teal-foreground uppercase"
        >
          Back to checkout
        </a>
      </div>
    );
  }

  return (
    <OrderProcessingScreen
      title="Confirming your payment"
      subtitle="Please wait — we are verifying Cashfree and placing your order."
    />
  );
}

export default function CheckoutReturnPage() {
  return (
    <Suspense
      fallback={
        <OrderProcessingScreen
          title="Confirming your payment"
          subtitle="Please wait — we are verifying Cashfree and placing your order."
        />
      }
    >
      <ReturnInner />
    </Suspense>
  );
}
