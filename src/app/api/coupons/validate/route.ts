import { NextResponse } from "next/server";
import { z } from "zod";

import { quoteCoupon } from "@/lib/promotions.server";
import { getCustomerSession } from "@/lib/customer-auth.server";

export const dynamic = "force-dynamic";

const bodySchema = z.object({
  code: z.string().trim().max(40),
  lines: z
    .array(
      z.object({
        productId: z.string(),
        unitPrice: z.number(),
        quantity: z.number().int().min(1),
      }),
    )
    .max(50),
});

export async function POST(request: Request) {
  try {
    const body = bodySchema.parse(await request.json());
    const session = await getCustomerSession();
    const quote = await quoteCoupon({
      code: body.code,
      customerId: session?.id,
      lines: body.lines,
    });
    return NextResponse.json(quote, { status: quote.ok ? 200 : 409 });
  } catch (error) {
    return NextResponse.json(
      { ok: false, discount: 0, error: error instanceof Error ? error.message : "Could not validate coupon." },
      { status: 400 },
    );
  }
}
