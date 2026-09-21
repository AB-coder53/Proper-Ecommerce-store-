import { NextResponse } from "next/server";

import { requireAdminSession } from "@/lib/admin-auth.server";
import { getAnalyticsSummary } from "@/lib/analytics.server";

export async function GET(request: Request) {
  try {
    await requireAdminSession();
    const { searchParams } = new URL(request.url);
    const days = Math.min(90, Math.max(1, Number(searchParams.get("days") ?? "7") || 7));
    const summary = await getAnalyticsSummary(days);
    return NextResponse.json(summary);
  } catch (error) {
    if (error instanceof Error && error.message === "Unauthorized") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    const message = error instanceof Error ? error.message : "Could not load analytics";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
