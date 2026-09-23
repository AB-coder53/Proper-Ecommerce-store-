import { NextResponse } from "next/server";

import { requireAdminSession } from "@/lib/admin-auth.server";
import { createAdminReview, listAdminReviews } from "@/lib/reviews.server";

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

export async function POST(request: Request) {
  try {
    await requireAdminSession();
    const review = await createAdminReview(await request.json());
    return NextResponse.json({ review });
  } catch (error) {
    const err = error as Error & { status?: number };
    if (err.message === "Unauthorized") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    return NextResponse.json(
      { error: err.message || "Could not add review." },
      { status: err.status ?? (err.name === "ZodError" ? 400 : 500) },
    );
  }
}
