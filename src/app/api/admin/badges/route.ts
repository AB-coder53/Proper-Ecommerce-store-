import { NextResponse } from "next/server";
import { ZodError } from "zod";

import { requireAdminSession } from "@/lib/admin-auth.server";
import { listBadges, saveBadge } from "@/lib/promotions.server";
import { productBadgeSchema } from "@/lib/promotions";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    await requireAdminSession();
    const badges = await listBadges();
    return NextResponse.json({ badges });
  } catch {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
}

export async function POST(request: Request) {
  try {
    await requireAdminSession();
    const badge = await saveBadge(productBadgeSchema.parse(await request.json()), "create");
    return NextResponse.json({ badge }, { status: 201 });
  } catch (error) {
    if (error instanceof Error && error.message === "Unauthorized") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    if (error instanceof ZodError) {
      return NextResponse.json(
        { error: error.issues[0]?.message ?? "Invalid badge" },
        { status: 400 },
      );
    }
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Could not save badge" },
      { status: 400 },
    );
  }
}
