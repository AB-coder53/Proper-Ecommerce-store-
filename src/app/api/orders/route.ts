import { after, NextResponse } from "next/server";

import { listOrdersForCustomer, placeOrder } from "@/lib/commerce.server";
import { checkoutSchema } from "@/lib/commerce-types";
import { getCustomerSession } from "@/lib/customer-auth.server";
import { notifyOrderEvent } from "@/lib/notifications.server";
import { withExpectedDelivery } from "@/lib/order-tracking.server";

export const dynamic = "force-dynamic";

export async function GET() {
  const session = await getCustomerSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const orders = await withExpectedDelivery(await listOrdersForCustomer(session.id));
  return NextResponse.json({ orders });
}

export async function POST(request: Request) {
  try {
    const session = await getCustomerSession();
    if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    const body = checkoutSchema.parse(await request.json());
    const order = await placeOrder(session, body);
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
