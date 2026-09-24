import { NextResponse } from "next/server";

import {
  attachCustomerSessionCookie,
  clearCustomerSessionCookie,
  getCustomerSession,
  loginCustomer,
  signupCustomer,
} from "@/lib/customer-auth.server";
import { getCart, getWishlist, mergeGuestCart } from "@/lib/commerce.server";
import { cartItemInputSchema, loginSchema, signupSchema } from "@/lib/commerce-types";
import { z } from "zod";

export const dynamic = "force-dynamic";

export async function GET() {
  const customer = await getCustomerSession();
  return NextResponse.json({ customer });
}

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as Record<string, unknown>;
    const mode = body["mode"] === "login" ? "login" : "signup";
    const guestCart = z
      .array(cartItemInputSchema)
      .optional()
      .parse(body["guestCart"] ?? []);

    const customer =
      mode === "login"
        ? await loginCustomer(loginSchema.parse(body))
        : await signupCustomer(signupSchema.parse(body));

    const [cart, wishlist] = await Promise.all([
      guestCart?.length ? mergeGuestCart(customer.id, guestCart) : getCart(customer.id),
      getWishlist(customer.id),
    ]);

    const response = NextResponse.json({ customer, cart, wishlist });
    attachCustomerSessionCookie(response, customer.id);
    return response;
  } catch (error) {
    const err = error as Error & { status?: number; issues?: unknown };
    const status = err.status ?? (err.name === "ZodError" ? 400 : 500);
    const message =
      err.name === "ZodError"
        ? "Please check your details and try again."
        : err.message || "Authentication failed.";
    return NextResponse.json({ error: message }, { status });
  }
}

export async function DELETE() {
  const response = NextResponse.json({ ok: true });
  clearCustomerSessionCookie(response);
  return response;
}
