import { NextResponse } from "next/server";

import { requireAdminSession } from "@/lib/admin-auth.server";
import { listOrderNotifications } from "@/lib/notifications.server";

type Ctx = { params: Promise<{ id: string }> };

export const dynamic = "force-dynamic";

export async function GET(_: Request, ctx: Ctx) {
  try {
    await requireAdminSession();
    const { id } = await ctx.params;
    const notifications = await listOrderNotifications(id);
    return NextResponse.json({ notifications });
  } catch {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
}
