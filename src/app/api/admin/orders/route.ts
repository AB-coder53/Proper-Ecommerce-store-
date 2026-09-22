import { NextResponse } from "next/server";

import { requireAdminSession } from "@/lib/admin-auth.server";
import { listAllOrders } from "@/lib/commerce.server";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    await requireAdminSession();
    const orders = await listAllOrders();
    return NextResponse.json({ orders }, { headers: { "Cache-Control": "no-store, max-age=0" } });
  } catch {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
}
