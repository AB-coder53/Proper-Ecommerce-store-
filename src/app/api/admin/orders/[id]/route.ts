import { after, NextResponse } from "next/server";

import { requireAdminSession } from "@/lib/admin-auth.server";
import { getOrderById, updateOrderStatus } from "@/lib/commerce.server";
import { notifyOrderChanges } from "@/lib/notifications.server";
import { orderStatusSchema } from "@/lib/commerce-types";
import { z } from "zod";

export const dynamic = "force-dynamic";

const patchSchema = z.object({
  orderStatus: orderStatusSchema,
  paymentStatus: z.enum(["pending", "paid", "failed", "refunded"]).optional(),
  trackingNumber: z.string().trim().max(80).optional().or(z.literal("")),
  carrier: z.string().trim().max(80).optional().or(z.literal("")),
  trackingUrl: z.string().trim().max(300).optional().or(z.literal("")),
});

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
    const body = patchSchema.parse(await request.json());
    const previous = await getOrderById(id);
    if (!previous) return NextResponse.json({ error: "Order not found." }, { status: 404 });
    const order = await updateOrderStatus(id, body.orderStatus, {
      paymentStatus: body.paymentStatus,
      trackingNumber: body.trackingNumber,
      carrier: body.carrier,
      trackingUrl: body.trackingUrl,
    });
    if (!order) return NextResponse.json({ error: "Order not found." }, { status: 404 });
    after(() => {
      void notifyOrderChanges(previous, order);
    });
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
