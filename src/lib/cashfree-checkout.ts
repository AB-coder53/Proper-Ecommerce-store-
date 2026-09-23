export type CashfreeCheckout = {
  checkout: (options: {
    paymentSessionId: string;
    redirectTarget?: "_self" | "_blank" | "_modal";
  }) => Promise<{ error?: { message?: string }; paymentDetails?: unknown } | void>;
};

type CashfreeFactory = (options: { mode: "sandbox" | "production" }) => CashfreeCheckout;

declare global {
  interface Window {
    Cashfree?: CashfreeFactory;
  }
}

export async function loadCashfreeCheckout(
  mode: "sandbox" | "production",
): Promise<CashfreeCheckout> {
  if (typeof window === "undefined") {
    throw new Error("Cashfree can only open in the browser.");
  }
  if (!window.Cashfree) {
    await new Promise<void>((resolve, reject) => {
      const existing = document.querySelector<HTMLScriptElement>('script[data-cashfree-sdk="v3"]');
      if (existing) {
        existing.addEventListener("load", () => resolve(), { once: true });
        existing.addEventListener(
          "error",
          () => reject(new Error("Cashfree SDK failed to load.")),
          {
            once: true,
          },
        );
        return;
      }
      const script = document.createElement("script");
      script.src = "https://sdk.cashfree.com/js/v3/cashfree.js";
      script.async = true;
      script.dataset["cashfreeSdk"] = "v3";
      script.onload = () => resolve();
      script.onerror = () => reject(new Error("Cashfree SDK failed to load."));
      document.head.appendChild(script);
    });
  }
  if (!window.Cashfree) throw new Error("Cashfree SDK failed to load.");
  return window.Cashfree({ mode });
}
