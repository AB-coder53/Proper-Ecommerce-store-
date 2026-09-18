import { NextResponse } from "next/server";

import { updateCustomerProfile } from "@/lib/commerce.server";
import { profileUpdateSchema } from "@/lib/commerce-types";
import { getCustomerSession, toPublicCustomer } from "@/lib/customer-auth.server";

export const dynamic = "force-dynamic";

export async function GET() {
  const session = await getCustomerSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  return NextResponse.json({ customer: session });
}

export async function PATCH(request: Request) {
  try {
    const session = await getCustomerSession();
    if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    const body = profileUpdateSchema.parse(await request.json());
    const updated = await updateCustomerProfile(session.id, {
      fullName: body.fullName,
      phone: body.phone,
      alternatePhone: body.alternatePhone || null,
    });
    return NextResponse.json({ customer: toPublicCustomer(updated) });
  } catch (error) {
    const err = error as Error & { status?: number };
    return NextResponse.json(
      { error: err.message || "Could not update profile." },
      { status: err.status ?? (err.name === "ZodError" ? 400 : 500) },
    );
  }
}
