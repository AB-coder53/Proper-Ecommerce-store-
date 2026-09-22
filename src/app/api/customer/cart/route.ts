import { NextResponse } from "next/server";
import { z } from "zod";

import {
  getCart,
  mergeGuestCart,
  removeCartItem,
  setCartItemQuantity,
  setCartItemVariant,
  upsertCartItem,
} from "@/lib/commerce.server";
import { CART_MAX_QUANTITY } from "@/lib/commerce-constants";
import { cartItemInputSchema } from "@/lib/commerce-types";
import { getCustomerSession } from "@/lib/customer-auth.server";

export const dynamic = "force-dynamic";

export async function GET() {
  const session = await getCustomerSession();
  if (!session) return NextResponse.json({ items: [] });
  const items = await getCart(session.id);
  return NextResponse.json({ items });
}

export async function POST(request: Request) {
  try {
    const session = await getCustomerSession();
    if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    const body = (await request.json()) as Record<string, unknown>;

    if (body["action"] === "merge") {
      const guestCart = z.array(cartItemInputSchema).parse(body["items"] ?? []);
      const items = await mergeGuestCart(session.id, guestCart);
      return NextResponse.json({ items });
    }

    if (body["action"] === "setQuantity") {
      const parsed = z
        .object({
          itemId: z.string().min(1),
          quantity: z.number().int().min(0).max(CART_MAX_QUANTITY),
        })
        .parse(body);
      const items = await setCartItemQuantity(session.id, parsed.itemId, parsed.quantity);
      return NextResponse.json({ items });
    }

    if (body["action"] === "remove") {
      const parsed = z.object({ itemId: z.string().min(1) }).parse(body);
      const items = await removeCartItem(session.id, parsed.itemId);
      return NextResponse.json({ items });
    }

    if (body["action"] === "setVariant") {
      const parsed = z
        .object({
          itemId: z.string().min(1),
          size: z.string().trim().min(1).max(10),
          color: z.string().trim().min(1).max(40),
        })
        .parse(body);
      const items = await setCartItemVariant(session.id, parsed.itemId, parsed.size, parsed.color);
      return NextResponse.json({ items });
    }

    const input = cartItemInputSchema.parse(body);
    const items = await upsertCartItem(session.id, input);
    return NextResponse.json({ items });
  } catch (error) {
    const err = error as Error & { status?: number };
    return NextResponse.json(
      { error: err.message || "Could not update cart." },
      { status: err.status ?? (err.name === "ZodError" ? 400 : 500) },
    );
  }
}
