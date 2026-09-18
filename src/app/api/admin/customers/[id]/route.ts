import { NextResponse } from "next/server";

import { requireAdminSession } from "@/lib/admin-auth.server";
import { getCustomerAdmin } from "@/lib/commerce.server";

export const dynamic = "force-dynamic";

export async function GET(_request: Request, context: { params: Promise<{ id: string }> }) {
  try {
    await requireAdminSession();
    const { id } = await context.params;
    const result = await getCustomerAdmin(id);
    if (!result) return NextResponse.json({ error: "Customer not found." }, { status: 404 });
    return NextResponse.json(result);
  } catch {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
}
