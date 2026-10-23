import { NextResponse } from "next/server";
import { ZodError, z } from "zod";

import { requireAdminSession } from "@/lib/admin-auth.server";
import { invalidateCatalogCache } from "@/lib/catalog.server";
import { setAbsoluteVariantStock } from "@/lib/inventory.server";

const bodySchema = z.object({
  productId: z.string().trim().min(1),
  color: z.string().trim().min(1),
  size: z.string().trim().min(1),
  stock: z.number().int().min(0).max(99999),
});

export async function PATCH(request: Request) {
  try {
    await requireAdminSession();
    const body = bodySchema.parse(await request.json());
    const result = await setAbsoluteVariantStock(body);
    invalidateCatalogCache();
    return NextResponse.json(result);
  } catch (error) {
    const err = error as Error & { status?: number };
    if (err.message === "Unauthorized") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    if (error instanceof ZodError) {
      return NextResponse.json({ error: "Enter a valid stock count." }, { status: 400 });
    }
    return NextResponse.json(
      { error: err.message || "Could not update stock." },
      { status: err.status ?? 400 },
    );
  }
}
