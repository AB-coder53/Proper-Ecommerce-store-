import { NextResponse } from "next/server";
import { ZodError } from "zod";

import { requireAdminSession } from "@/lib/admin-auth.server";
import { bundleOfferSchema } from "@/lib/store-offers";
import { getBundleOffers, saveBundleOffer } from "@/lib/store-offers.server";

export async function GET() {
  try {
    await requireAdminSession();
    const bundles = (await getBundleOffers()).filter((offer) => !offer.deletedAt);
    return NextResponse.json({ bundles });
  } catch {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
}

export async function POST(request: Request) {
  try {
    await requireAdminSession();
    const body: unknown = await request.json();
    const offer = bundleOfferSchema.parse(body);
    const saved = await saveBundleOffer(offer, "create");
    return NextResponse.json({ bundle: saved }, { status: 201 });
  } catch (error) {
    if (error instanceof Error && error.message === "Unauthorized") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    if (error instanceof ZodError) {
      return NextResponse.json(
        { error: error.issues[0]?.message ?? "Invalid bundle" },
        { status: 400 },
      );
    }
    const message = error instanceof Error ? error.message : "Could not create bundle";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
