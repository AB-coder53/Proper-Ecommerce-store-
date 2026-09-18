import { NextResponse } from "next/server";
import { ZodError } from "zod";

import { requireAdminSession } from "@/lib/admin-auth.server";
import { deleteProduct, getProductById, saveProduct } from "@/lib/catalog.server";
import { productSchema } from "@/lib/catalog-types";

type Ctx = { params: Promise<{ id: string }> };

export async function GET(_: Request, ctx: Ctx) {
  try {
    await requireAdminSession();
    const { id } = await ctx.params;
    const product = await getProductById(id);
    if (!product) return NextResponse.json({ error: "Not found" }, { status: 404 });
    return NextResponse.json({ product });
  } catch {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
}

export async function PUT(request: Request, ctx: Ctx) {
  try {
    await requireAdminSession();
    const { id } = await ctx.params;
    const body: unknown = await request.json();
    const parsed = productSchema.parse(body);
    if (parsed.id !== id) {
      return NextResponse.json({ error: "Product id cannot be changed." }, { status: 400 });
    }
    const saved = await saveProduct(parsed, "update");
    return NextResponse.json({ product: saved });
  } catch (error) {
    if (error instanceof Error && error.message === "Unauthorized") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    if (error instanceof ZodError) {
      return NextResponse.json(
        { error: error.issues[0]?.message ?? "Invalid product" },
        { status: 400 },
      );
    }
    const message = error instanceof Error ? error.message : "Could not update product";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}

export async function DELETE(_: Request, ctx: Ctx) {
  try {
    await requireAdminSession();
    const { id } = await ctx.params;
    await deleteProduct(id);
    return NextResponse.json({ ok: true });
  } catch (error) {
    if (error instanceof Error && error.message === "Unauthorized") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    const message = error instanceof Error ? error.message : "Could not delete product";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
