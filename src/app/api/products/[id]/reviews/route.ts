import { NextResponse } from "next/server";
import { ZodError } from "zod";

import { getCustomerSession } from "@/lib/customer-auth.server";
import { getReviewEligibility, listPublicReviews, submitReview } from "@/lib/reviews.server";

type Ctx = { params: Promise<{ id: string }> };

export const dynamic = "force-dynamic";

export async function GET(request: Request, ctx: Ctx) {
  const { id } = await ctx.params;
  const { searchParams } = new URL(request.url);
  const page = Math.max(1, Number(searchParams.get("page") ?? "1") || 1);
  const sortRaw = searchParams.get("sort") ?? "newest";
  const sort = sortRaw === "highest" || sortRaw === "lowest" ? sortRaw : "newest";
  const customer = await getCustomerSession();
  const [listing, eligibility] = await Promise.all([
    listPublicReviews(id, page, sort),
    getReviewEligibility(id, customer),
  ]);
  return NextResponse.json({ ...listing, eligibility });
}

export async function POST(request: Request, ctx: Ctx) {
  try {
    const customer = await getCustomerSession();
    if (!customer) {
      return NextResponse.json({ error: "Please log in to submit a review." }, { status: 401 });
    }
    const { id } = await ctx.params;
    const result = await submitReview(id, customer, await request.json());
    return NextResponse.json(result, { status: 201 });
  } catch (error) {
    const err = error as Error & { status?: number };
    if (error instanceof ZodError) {
      return NextResponse.json(
        { error: error.issues[0]?.message ?? "Invalid review." },
        { status: 400 },
      );
    }
    return NextResponse.json(
      { error: err.message || "Could not submit review." },
      { status: err.status ?? 400 },
    );
  }
}
