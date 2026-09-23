import { NextResponse } from "next/server";

import { createCashfreeOrder, getCashfreeConfig } from "@/lib/cashfree.server";
import { quoteCheckout } from "@/lib/commerce.server";
import { checkoutSchema } from "@/lib/commerce-types";
import { getCustomerSession } from "@/lib/customer-auth.server";
import { normalizeMobile } from "@/lib/reservation-utils";

export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  try {
    const session = await getCustomerSession();
    if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    const body = checkoutSchema.parse(await request.json());
    const checkoutId = body.checkoutId?.trim();
    if (!checkoutId) {
      return NextResponse.json(
        { error: "Checkout session is missing. Refresh and try again." },
        { status: 400 },
      );
    }

    const quote = await quoteCheckout(session, body);
    if (quote.totalAmount <= 0) {
      return NextResponse.json({ skipPayment: true, amount: 0 });
    }

    const config = getCashfreeConfig();
    if (!config.configured) {
      return NextResponse.json(
        {
          error:
            "Cashfree is not configured. Add CASHFREE_APP_ID and CASHFREE_SECRET_KEY, then restart the app.",
        },
        { status: 503 },
      );
    }

    const phone = normalizeMobile(session.phone);
    if (!phone) {
      return NextResponse.json(
        { error: "Add a valid 10-digit mobile number in your account before paying." },
        { status: 400 },
      );
    }

    const cashfree = await createCashfreeOrder({
      checkoutId,
      amount: quote.totalAmount,
      customerId: session.id,
      customerName: session.fullName,
      customerEmail: session.email,
      customerPhone: phone,
    });
    if (!cashfree.order_id) {
      return NextResponse.json(
        { error: cashfree.message || "Could not start Cashfree checkout." },
        { status: 502 },
      );
    }

    if (String(cashfree.order_status || "").toUpperCase() === "PAID") {
      return NextResponse.json({
        skipPayment: false,
        alreadyPaid: true,
        amount: quote.totalAmount,
        mode: config.mode,
        cashfreeOrderId: cashfree.order_id,
      });
    }

    if (!cashfree.payment_session_id) {
      return NextResponse.json(
        { error: cashfree.message || "Could not start Cashfree checkout." },
        { status: 502 },
      );
    }

    return NextResponse.json({
      skipPayment: false,
      amount: quote.totalAmount,
      mode: config.mode,
      cashfreeOrderId: cashfree.order_id,
      paymentSessionId: cashfree.payment_session_id,
    });
  } catch (error) {
    const err = error as Error & { status?: number };
    return NextResponse.json(
      { error: err.message || "Could not start payment." },
      { status: err.status ?? (err.name === "ZodError" ? 400 : 500) },
    );
  }
}
