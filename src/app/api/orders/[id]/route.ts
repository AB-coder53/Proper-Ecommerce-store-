import { NextResponse } from "next/server";

import { getOrderForCustomer } from "@/lib/commerce.server";
import { getCustomerSession } from "@/lib/customer-auth.server";

export const dynamic = "force-dynamic";

export async function GET(_request: Request, context: { params: Promise<{ id: string }> }) {
  const session = await getCustomerSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const { id } = await context.params;
  const order = await getOrderForCustomer(session.id, id);
  if (!order) return NextResponse.json({ error: "Order not found." }, { status: 404 });
  return NextResponse.json({ order });
}
