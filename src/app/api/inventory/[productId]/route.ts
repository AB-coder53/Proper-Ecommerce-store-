import { NextResponse } from "next/server";

import { listVariantsForProducts } from "@/lib/inventory.server";

export const dynamic = "force-dynamic";

export async function GET(_request: Request, context: { params: Promise<{ productId: string }> }) {
  const { productId } = await context.params;
  const variants = await listVariantsForProducts([productId]);
  return NextResponse.json({ variants }, { headers: { "Cache-Control": "no-store" } });
}
