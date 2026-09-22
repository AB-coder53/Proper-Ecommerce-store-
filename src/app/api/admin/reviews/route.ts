import { NextResponse } from "next/server";

import { requireAdminSession } from "@/lib/admin-auth.server";
import { listAdminReviews } from "@/lib/reviews.server";

export const dynamic = "force-dynamic";

export async function GET(request: Request) {
  try {
    await requireAdminSession();
    const { searchParams } = new URL(request.url);
    const status = searchParams.get("status") ?? "pending";
    const productId = searchParams.get("q") ?? "";
    const reviews = await listAdminReviews({ status, productId });
    return NextResponse.json({ reviews });
  } catch {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
}
