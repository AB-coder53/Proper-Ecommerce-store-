import { NextResponse } from "next/server";

import { getGuestTrackingFromCookie } from "@/lib/order-tracking.server";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    const tracking = await getGuestTrackingFromCookie();
    if (!tracking) return NextResponse.json({ tracking: null });
    return NextResponse.json({ tracking });
  } catch (error) {
    const err = error as Error & { status?: number };
    return NextResponse.json(
      { error: err.message || "Please check your order number and try again." },
      { status: err.status ?? 401 },
    );
  }
}

export async function POST() {
  return NextResponse.json(
    { error: "Please check your order number and try again." },
    { status: 400 },
  );
}
