import { NextResponse } from "next/server";
import { ZodError } from "zod";

import { requireAdminSession } from "@/lib/admin-auth.server";
import { listCoupons, saveCoupon } from "@/lib/promotions.server";
import { couponSchema } from "@/lib/promotions";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    await requireAdminSession();
    const coupons = await listCoupons();
    return NextResponse.json({ coupons });
  } catch {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
}

export async function POST(request: Request) {
  try {
    await requireAdminSession();
    const coupon = await saveCoupon(couponSchema.parse(await request.json()), "create");
    return NextResponse.json({ coupon }, { status: 201 });
  } catch (error) {
    if (error instanceof Error && error.message === "Unauthorized") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    if (error instanceof ZodError) {
      return NextResponse.json(
        { error: error.issues[0]?.message ?? "Invalid coupon" },
        { status: 400 },
      );
    }
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Could not save coupon" },
      { status: 400 },
    );
  }
}
