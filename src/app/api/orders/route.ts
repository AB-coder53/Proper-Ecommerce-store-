import { after, NextResponse } from "next/server";

import { getCashfreeConfig, verifyCashfreePayment } from "@/lib/cashfree.server";
import { listOrdersForCustomer, placeOrder, quoteCheckout } from "@/lib/commerce.server";
import { checkoutSchema } from "@/lib/commerce-types";
import { getCustomerSession } from "@/lib/customer-auth.server";
import { notifyOrderEvent } from "@/lib/notifications.server";
import { withExpectedDelivery } from "@/lib/order-tracking.server";

export const dynamic = "force-dynamic";

export async function GET() {
  const session = await getCustomerSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const orders = await withExpectedDelivery(await listOrdersForCustomer(session.id));
  return NextResponse.json({ orders }, { headers: { "Cache-Control": "no-store, max-age=0" } });
}

export async function POST(request: Request) {
  try {
    const session = await getCustomerSession();
    if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    const body = checkoutSchema.parse(await request.json());
    const quote = await quoteCheckout(session, body);
    const cashfree = getCashfreeConfig();

    if (quote.totalAmount > 0) {
      if (!cashfree.configured) {
        return NextResponse.json(
          {
            error:
              "Cashfree is not configured. Add CASHFREE_APP_ID and CASHFREE_SECRET_KEY, then restart the app.",
          },
          { status: 503 },
        );
      }
      if (!body.cashfreeOrderId) {
        return NextResponse.json(
          { error: "Complete payment to place this order." },
          { status: 400 },
        );
      }
      const paid = await verifyCashfreePayment(body.cashfreeOrderId, quote.totalAmount);
      const order = await placeOrder(session, body, {
        paymentStatus: "paid",
        paymentMethod: "cashfree",
        paymentId: paid.paymentId,
        gatewayOrderId: paid.cashfreeOrderId,
      });
      after(() => {
        void notifyOrderEvent(order, "order_placed");
        if (order.paymentStatus === "paid") void notifyOrderEvent(order, "payment_confirmed");
      });
      return NextResponse.json({ order });
    }

    const order = await placeOrder(session, body, {
      paymentStatus: "paid",
      paymentMethod: "prepaid",
    });
    after(() => {
      void notifyOrderEvent(order, "order_placed");
    });
    return NextResponse.json({ order });
  } catch (error) {
    const err = error as Error & { status?: number };
    return NextResponse.json(
      { error: err.message || "Could not place order." },
      { status: err.status ?? (err.name === "ZodError" ? 400 : 500) },
    );
  }
}
