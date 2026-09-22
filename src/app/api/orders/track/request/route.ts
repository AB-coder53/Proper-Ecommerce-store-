import { NextResponse } from "next/server";

import { trackOrderRequestSchema } from "@/lib/commerce-types";
import { requestGuestTracking } from "@/lib/order-tracking.server";

export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  try {
    const body = trackOrderRequestSchema.parse(await request.json());
    const result = await requestGuestTracking(body.orderNumber);
    return NextResponse.json(result);
  } catch (error) {
    const err = error as Error & { status?: number };
    if (err.name === "ZodError") {
      return NextResponse.json(
        { error: "Please check your order number and try again." },
        { status: 400 },
      );
    }
    return NextResponse.json(
      { error: err.message || "Please check your order number and try again." },
      { status: err.status ?? 500 },
    );
  }
}
