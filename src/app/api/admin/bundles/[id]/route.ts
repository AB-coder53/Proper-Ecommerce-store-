import { NextResponse } from "next/server";
import { ZodError } from "zod";

import { requireAdminSession } from "@/lib/admin-auth.server";
import { bundleOfferSchema } from "@/lib/store-offers";
import { deleteBundleOffer, getBundleOfferById, saveBundleOffer } from "@/lib/store-offers.server";

type Params = { params: Promise<{ id: string }> };

export async function GET(_request: Request, { params }: Params) {
  try {
    await requireAdminSession();
    const { id } = await params;
    const bundle = await getBundleOfferById(id);
    if (!bundle) return NextResponse.json({ error: "Not found" }, { status: 404 });
    return NextResponse.json({ bundle });
  } catch {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
}

export async function PUT(request: Request, { params }: Params) {
  try {
    await requireAdminSession();
    const { id } = await params;
    const body: unknown = await request.json();
    const offer = bundleOfferSchema.parse({ ...(body as object), id });
    const saved = await saveBundleOffer(offer, "update");
    return NextResponse.json({ bundle: saved });
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
    const message = error instanceof Error ? error.message : "Could not save bundle";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}

export async function DELETE(_request: Request, { params }: Params) {
  try {
    await requireAdminSession();
    const { id } = await params;
    await deleteBundleOffer(id);
    return NextResponse.json({ ok: true });
  } catch (error) {
    if (error instanceof Error && error.message === "Unauthorized") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    const message = error instanceof Error ? error.message : "Could not delete bundle";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
