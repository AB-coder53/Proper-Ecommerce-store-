import { NextResponse } from "next/server";
import { ZodError } from "zod";

import { requireAdminSession } from "@/lib/admin-auth.server";
import { shippingSettingsSchema } from "@/lib/shipping";
import { getShippingSettings, saveShippingSettings } from "@/lib/shipping.server";

export async function GET() {
  try {
    await requireAdminSession();
    const settings = await getShippingSettings();
    return NextResponse.json({ settings });
  } catch {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
}

export async function PUT(request: Request) {
  try {
    await requireAdminSession();
    const body: unknown = await request.json();
    const settings = await saveShippingSettings(shippingSettingsSchema.parse(body));
    return NextResponse.json({ settings });
  } catch (error) {
    if (error instanceof Error && error.message === "Unauthorized") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    if (error instanceof ZodError) {
      return NextResponse.json(
        { error: error.issues[0]?.message ?? "Invalid shipping settings" },
        { status: 400 },
      );
    }
    const message = error instanceof Error ? error.message : "Could not save settings";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
