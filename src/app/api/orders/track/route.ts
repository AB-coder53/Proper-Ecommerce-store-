import { NextResponse } from "next/server";

import { trackOrder } from "@/lib/commerce.server";
import { trackOrderSchema } from "@/lib/commerce-types";

export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  try {
    const body = trackOrderSchema.parse(await request.json());
    const order = await trackOrder(body.orderNumber, body.email);
    if (!order) {
      return NextResponse.json(
        { error: "No order found for that Order ID and email combination." },
        { status: 404 },
      );
    }
    return NextResponse.json({ order });
  } catch (error) {
    const err = error as Error & { status?: number };
    return NextResponse.json(
      { error: err.message || "Could not track order." },
      { status: err.status ?? (err.name === "ZodError" ? 400 : 500) },
    );
  }
}
