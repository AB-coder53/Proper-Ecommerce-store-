import { NextResponse } from "next/server";

import { requireAdminSession } from "@/lib/admin-auth.server";
import { ensureInvoiceNumber } from "@/lib/commerce.server";
import { invoiceHtml } from "@/lib/invoice";

type Ctx = { params: Promise<{ id: string }> };

export const dynamic = "force-dynamic";

export async function GET(request: Request, ctx: Ctx) {
  try {
    await requireAdminSession();
    const { id } = await ctx.params;
    const order = await ensureInvoiceNumber(id);
    const invoiceNumber = order.invoiceNumber || `INV-${order.orderNumber}`;
    const download = new URL(request.url).searchParams.get("download");
    return new NextResponse(invoiceHtml(order), {
      headers: {
        "Content-Type": "text/html; charset=utf-8",
        "Cache-Control": "no-store",
        ...(download
          ? { "Content-Disposition": `attachment; filename="${invoiceNumber}.html"` }
          : {}),
      },
    });
  } catch (error) {
    const err = error as Error & { status?: number };
    if (err.message === "Unauthorized") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    return NextResponse.json({ error: err.message || "Could not generate invoice." }, { status: err.status ?? 500 });
  }
}
