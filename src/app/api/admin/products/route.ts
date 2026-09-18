import { NextResponse } from "next/server";
import { ZodError } from "zod";

import { requireAdminSession } from "@/lib/admin-auth.server";
import { getProducts, saveProduct } from "@/lib/catalog.server";
import { productSchema } from "@/lib/catalog-types";

export async function GET() {
  try {
    await requireAdminSession();
    const products = await getProducts();
    return NextResponse.json({ products });
  } catch {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
}

export async function POST(request: Request) {
  try {
    await requireAdminSession();
    const body: unknown = await request.json();
    const product = productSchema.parse(body);
    const saved = await saveProduct(product, "create");
    return NextResponse.json({ product: saved }, { status: 201 });
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
    const message = error instanceof Error ? error.message : "Could not create product";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
