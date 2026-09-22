import { NextResponse } from "next/server";
import { z } from "zod";

import { requireAdminSession } from "@/lib/admin-auth.server";
import { deleteReview, moderateReview } from "@/lib/reviews.server";
import { reviewStatusSchema } from "@/lib/reviews";

type Ctx = { params: Promise<{ id: string }> };

export const dynamic = "force-dynamic";

export async function PATCH(request: Request, ctx: Ctx) {
  try {
    await requireAdminSession();
    const { id } = await ctx.params;
    const body = z.object({ status: reviewStatusSchema }).parse(await request.json());
    await moderateReview(id, body.status);
    return NextResponse.json({ ok: true });
  } catch (error) {
    const err = error as Error & { status?: number };
    if (err.message === "Unauthorized") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    return NextResponse.json(
      { error: err.message || "Could not update review." },
      { status: err.status ?? 400 },
    );
  }
}

export async function DELETE(_: Request, ctx: Ctx) {
  try {
    await requireAdminSession();
    const { id } = await ctx.params;
    await deleteReview(id);
    return NextResponse.json({ ok: true });
  } catch (error) {
    const err = error as Error & { status?: number };
    if (err.message === "Unauthorized") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    return NextResponse.json(
      { error: err.message || "Could not delete review." },
      { status: err.status ?? 400 },
    );
  }
}
