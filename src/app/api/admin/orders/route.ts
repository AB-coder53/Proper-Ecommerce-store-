import { NextResponse } from "next/server";

import { requireAdminSession } from "@/lib/admin-auth.server";
import { createAdminOrder, listAllOrders } from "@/lib/commerce.server";
import { adminOrderSchema } from "@/lib/commerce-types";

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

export async function POST(request: Request) {
  try {
    await requireAdminSession();
    const order = await createAdminOrder(adminOrderSchema.parse(await request.json()));
    return NextResponse.json(
      { order },
      { status: 201, headers: { "Cache-Control": "no-store, max-age=0" } },
    );
  } catch (error) {
    const err = error as Error & { status?: number };
    if (err.message === "Unauthorized") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    return NextResponse.json(
      { error: err.message || "Could not create order." },
      { status: err.status ?? (err.name === "ZodError" ? 400 : 500) },
    );
  }
}
