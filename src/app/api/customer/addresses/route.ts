import { NextResponse } from "next/server";

import { deleteAddress, listAddresses, saveAddress } from "@/lib/commerce.server";
import { addressSchema } from "@/lib/commerce-types";
import { getCustomerSession } from "@/lib/customer-auth.server";

export const dynamic = "force-dynamic";

export async function GET() {
  const session = await getCustomerSession();
  if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const addresses = await listAddresses(session.id);
  return NextResponse.json({ addresses });
}

export async function POST(request: Request) {
  try {
    const session = await getCustomerSession();
    if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    const body = addressSchema.parse(await request.json());
    const address = await saveAddress(session.id, body);
    return NextResponse.json({ address });
  } catch (error) {
    const err = error as Error & { status?: number };
    return NextResponse.json(
      { error: err.message || "Could not save address." },
      { status: err.status ?? (err.name === "ZodError" ? 400 : 500) },
    );
  }
}

export async function DELETE(request: Request) {
  try {
    const session = await getCustomerSession();
    if (!session) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    const { searchParams } = new URL(request.url);
    const id = searchParams.get("id");
    if (!id) return NextResponse.json({ error: "Address id required." }, { status: 400 });
    await deleteAddress(session.id, id);
    return NextResponse.json({ ok: true });
  } catch (error) {
    const err = error as Error & { status?: number };
    return NextResponse.json(
      { error: err.message || "Could not delete address." },
      { status: 500 },
    );
  }
}
