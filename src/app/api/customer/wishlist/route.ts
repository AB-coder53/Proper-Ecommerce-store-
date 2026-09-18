import { NextResponse } from "next/server";
import { z } from "zod";

import { addWishlistItem, getWishlist, removeWishlistItem } from "@/lib/commerce.server";
import { getCustomerSession } from "@/lib/customer-auth.server";

export const dynamic = "force-dynamic";

export async function GET() {
  const session = await getCustomerSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const items = await getWishlist(session.id);
  return NextResponse.json({ items });
}

export async function POST(request: Request) {
  try {
    const session = await getCustomerSession();
    if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    const body = z.object({ productId: z.string().min(1) }).parse(await request.json());
    const items = await addWishlistItem(session.id, body.productId);
    return NextResponse.json({ items });
  } catch (error) {
    const err = error as Error & { status?: number };
    return NextResponse.json(
      { error: err.message || "Could not update wishlist." },
      { status: err.status ?? (err.name === "ZodError" ? 400 : 500) },
    );
  }
}

export async function DELETE(request: Request) {
  try {
    const session = await getCustomerSession();
    if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    const { searchParams } = new URL(request.url);
    const productId = searchParams.get("productId");
    if (!productId) return NextResponse.json({ error: "productId required." }, { status: 400 });
    const items = await removeWishlistItem(session.id, productId);
    return NextResponse.json({ items });
  } catch (error) {
    const err = error as Error & { status?: number };
    return NextResponse.json(
      { error: err.message || "Could not update wishlist." },
      { status: 500 },
    );
  }
}
