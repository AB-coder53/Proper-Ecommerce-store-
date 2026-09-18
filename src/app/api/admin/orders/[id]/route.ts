import { NextResponse } from "next/server";

import { requireAdminSession } from "@/lib/admin-auth.server";
import { getOrderById, updateOrderStatus } from "@/lib/commerce.server";
import { orderStatusSchema } from "@/lib/commerce-types";
import { z } from "zod";

export const dynamic = "force-dynamic";

export async function GET(_request: Request, context: { params: Promise<{ id: string }> }) {
  try {
    await requireAdminSession();
    const { id } = await context.params;
    const order = await getOrderById(id);
    if (!order) return NextResponse.json({ error: "Order not found." }, { status: 404 });
    return NextResponse.json({ order });
  } catch {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
}

export async function PATCH(request: Request, context: { params: Promise<{ id: string }> }) {
  try {
    await requireAdminSession();
    const { id } = await context.params;
    const body = z.object({ orderStatus: orderStatusSchema }).parse(await request.json());
    const order = await updateOrderStatus(id, body.orderStatus);
    if (!order) return NextResponse.json({ error: "Order not found." }, { status: 404 });
    return NextResponse.json({ order });
  } catch (error) {
    const err = error as Error & { status?: number };
    if (err.message === "Unauthorized") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    return NextResponse.json(
      { error: err.message || "Could not update order." },
      { status: err.status ?? (err.name === "ZodError" ? 400 : 500) },
    );
  }
}
