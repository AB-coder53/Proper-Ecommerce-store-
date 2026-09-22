import { NextResponse } from "next/server";

import { requireAdminSession } from "@/lib/admin-auth.server";
import {
  exportCustomersCsv,
  exportInventoryCsv,
  exportOrdersCsv,
  exportProductsCsv,
} from "@/lib/admin-export.server";

type Ctx = { params: Promise<{ type: string }> };

export const dynamic = "force-dynamic";

export async function GET(_: Request, ctx: Ctx) {
  try {
    await requireAdminSession();
    const { type } = await ctx.params;
    const exporters: Record<string, () => Promise<string>> = {
      orders: exportOrdersCsv,
      customers: exportCustomersCsv,
      products: exportProductsCsv,
      inventory: exportInventoryCsv,
    };
    const exporter = exporters[type];
    if (!exporter) return NextResponse.json({ error: "Unknown export." }, { status: 404 });
    const csv = await exporter();
    return new NextResponse(csv, {
      headers: {
        "Content-Type": "text/csv; charset=utf-8",
        "Content-Disposition": `attachment; filename="${type}.csv"`,
        "Cache-Control": "no-store",
      },
    });
  } catch {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
}
