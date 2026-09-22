import { NextResponse } from "next/server";

import { trackOrderVerifySchema } from "@/lib/commerce-types";
import { attachTrackingCookie, verifyGuestTracking } from "@/lib/order-tracking.server";

export const dynamic = "force-dynamic";

function clientIp(request: Request) {
  return (
    request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ||
    request.headers.get("x-real-ip") ||
    "unknown"
  );
}

export async function POST(request: Request) {
  try {
    const body = trackOrderVerifySchema.parse(await request.json());
    const tracking = await verifyGuestTracking(
      body.orderNumber,
      body.phoneLast4,
      clientIp(request),
    );
    const response = NextResponse.json({ tracking });
    attachTrackingCookie(response, tracking.orderNumber);
    return response;
  } catch (error) {
    const err = error as Error & { status?: number };
    const status = err.status ?? (err.name === "ZodError" ? 400 : 500);
    return NextResponse.json(
      {
        error:
          status === 500
            ? "Something went wrong. Please try again."
            : err.message || "Verification failed. Please try again.",
      },
      { status: status === 500 ? 500 : status },
    );
  }
}
