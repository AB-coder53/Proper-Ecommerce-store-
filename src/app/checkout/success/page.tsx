"use client";

import { Suspense, useEffect } from "react";
import { useSearchParams } from "next/navigation";

import { useCommerce } from "@/components/commerce/CommerceProvider";
import { OrderPlaced } from "@/components/commerce/OrderPlaced";
import { OrderProcessingScreen } from "@/components/commerce/OrderProcessingScreen";

function SuccessInner() {
  const params = useSearchParams();
  const orderNumber = params.get("order") || "";
  const paid = params.get("paid") === "1";
  const { closeCart } = useCommerce();

  useEffect(() => {
    closeCart();
  }, [closeCart]);

  return <OrderPlaced orderNumber={orderNumber} paid={paid} />;
}

export default function CheckoutSuccessPage() {
  return (
    <Suspense
      fallback={
        <OrderProcessingScreen
          title="Confirming your order"
          subtitle="Just a moment while we finish placing it."
        />
      }
    >
      <SuccessInner />
    </Suspense>
  );
}
