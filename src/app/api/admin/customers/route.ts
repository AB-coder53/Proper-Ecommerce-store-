import { NextResponse } from "next/server";

import { requireAdminSession } from "@/lib/admin-auth.server";
import { listCustomersAdmin } from "@/lib/commerce.server";

export const dynamic = "force-dynamic";

export async function GET() {
  try {
    await requireAdminSession();
    const customers = await listCustomersAdmin();
    return NextResponse.json({ customers });
  } catch {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
}
