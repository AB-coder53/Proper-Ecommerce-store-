import "server-only";

import { SITE_URL } from "@/lib/site";

const API_VERSION = "2025-01-01";

export type CashfreeMode = "sandbox" | "production";

type CashfreeOrder = {
  cf_order_id?: string | number;
  order_id?: string;
  order_amount?: number;
  order_currency?: string;
  order_status?: string;
  payment_session_id?: string;
  message?: string;
};

type CashfreePayment = {
  cf_payment_id?: string | number;
  payment_status?: string;
  payment_amount?: number;
  payment_currency?: string;
};

function cashfreeEnv(): CashfreeMode {
  const raw = (
    process.env["CASHFREE_ENV"] ||
    process.env["NEXT_PUBLIC_CASHFREE_MODE"] ||
    "sandbox"
  )
    .trim()
    .toLowerCase();
  return raw === "production" ? "production" : "sandbox";
}

function cashfreeBaseUrl(mode = cashfreeEnv()) {
  return mode === "production" ? "https://api.cashfree.com/pg" : "https://sandbox.cashfree.com/pg";
}

export function getCashfreeConfig() {
  const appId = (
    process.env["CASHFREE_APP_ID"] ||
    process.env["NEXT_PUBLIC_CASHFREE_APP_ID"] ||
    ""
  ).trim();
  const secretKey = (process.env["CASHFREE_SECRET_KEY"] || "").trim();
  const mode = cashfreeEnv();
  return {
    appId,
    secretKey,
    mode,
    configured: Boolean(appId && secretKey),
    baseUrl: cashfreeBaseUrl(mode),
  };
}

export function cashfreeOrderIdFromCheckoutId(checkoutId: string) {
  return `ab${checkoutId.replace(/-/g, "")}`;
}

export function checkoutIdFromCashfreeOrderId(orderId: string) {
  const hex = orderId.trim().replace(/^ab/i, "");
  if (!/^[0-9a-f]{32}$/i.test(hex)) return "";
  return `${hex.slice(0, 8)}-${hex.slice(8, 12)}-${hex.slice(12, 16)}-${hex.slice(16, 20)}-${hex.slice(20)}`;
}

function authHeaders() {
  const { appId, secretKey } = getCashfreeConfig();
  if (!appId || !secretKey) {
    throw Object.assign(
      new Error("Cashfree is not configured. Add CASHFREE_APP_ID and CASHFREE_SECRET_KEY."),
      {
        status: 503,
      },
    );
  }
  return {
    "Content-Type": "application/json",
    Accept: "application/json",
    "x-api-version": API_VERSION,
    "x-client-id": appId,
    "x-client-secret": secretKey,
  };
}

async function cashfreeFetch<T>(path: string, init?: RequestInit): Promise<T> {
  const { baseUrl } = getCashfreeConfig();
  const res = await fetch(`${baseUrl}${path}`, {
    ...init,
    headers: { ...authHeaders(), ...(init?.headers ?? {}) },
    cache: "no-store",
  });
  const body = (await res.json().catch(() => ({}))) as T & { message?: string };
  if (!res.ok) {
    throw Object.assign(new Error(body.message || "Cashfree request failed."), {
      status: res.status >= 400 && res.status < 500 ? res.status : 502,
    });
  }
  return body;
}

export async function createCashfreeOrder(input: {
  checkoutId: string;
  amount: number;
  customerId: string;
  customerName: string;
  customerEmail: string;
  customerPhone: string;
}) {
  const orderId = cashfreeOrderIdFromCheckoutId(input.checkoutId);
  const returnUrl = `${SITE_URL}/checkout/return?order_id={order_id}`;
  try {
    return await cashfreeFetch<CashfreeOrder>("/orders", {
      method: "POST",
      body: JSON.stringify({
        order_id: orderId,
        order_amount: input.amount,
        order_currency: "INR",
        customer_details: {
          customer_id: input.customerId.replace(/-/g, "").slice(0, 50),
          customer_name: input.customerName.slice(0, 100),
          customer_email: input.customerEmail.slice(0, 100),
          customer_phone: input.customerPhone,
        },
        order_meta: {
          return_url: returnUrl,
        },
        order_note: "AB Collection",
      }),
    });
  } catch (error) {
    const err = error as { status?: number; message?: string };
    if (err.status === 409 || /already exists|duplicate/i.test(err.message ?? "")) {
      return getCashfreeOrder(orderId);
    }
    throw error;
  }
}

export async function getCashfreeOrder(orderId: string) {
  return cashfreeFetch<CashfreeOrder>(`/orders/${encodeURIComponent(orderId)}`);
}

export async function getCashfreePayments(orderId: string) {
  return cashfreeFetch<CashfreePayment[]>(`/orders/${encodeURIComponent(orderId)}/payments`);
}

export async function verifyCashfreePayment(orderId: string, expectedAmount: number) {
  const order = await getCashfreeOrder(orderId);
  const status = String(order.order_status || "").toUpperCase();
  if (status !== "PAID") {
    throw Object.assign(
      new Error(
        status === "ACTIVE"
          ? "Payment is still pending. Complete payment to place the order."
          : "Payment was not completed. Your cart is unchanged.",
      ),
      { status: 409 },
    );
  }
  const paidAmount = Number(order.order_amount);
  if (!Number.isFinite(paidAmount) || Math.round(paidAmount) !== Math.round(expectedAmount)) {
    throw Object.assign(new Error("Paid amount does not match this order."), { status: 409 });
  }
  const payments = await getCashfreePayments(orderId).catch(() => [] as CashfreePayment[]);
  const success = payments.find(
    (row) => String(row.payment_status || "").toUpperCase() === "SUCCESS",
  );
  return {
    cashfreeOrderId: String(order.order_id || orderId),
    paymentId: success?.cf_payment_id != null ? String(success.cf_payment_id) : null,
    amount: paidAmount,
  };
}
