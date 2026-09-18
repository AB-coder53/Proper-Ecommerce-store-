import { NextResponse } from "next/server";
import { ZodError } from "zod";

import { requireAdminSession } from "@/lib/admin-auth.server";
import { getCollections, saveCollection } from "@/lib/catalog.server";
import { collectionSchema } from "@/lib/catalog-types";

export async function GET() {
  try {
    await requireAdminSession();
    const collections = await getCollections();
    return NextResponse.json({ collections });
  } catch {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
}

export async function POST(request: Request) {
  try {
    await requireAdminSession();
    const body: unknown = await request.json();
    const collection = collectionSchema.parse(body);
    const saved = await saveCollection(collection, "create");
    return NextResponse.json({ collection: saved }, { status: 201 });
  } catch (error) {
    if (error instanceof Error && error.message === "Unauthorized") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    if (error instanceof ZodError) {
      return NextResponse.json(
        { error: error.issues[0]?.message ?? "Invalid collection" },
        { status: 400 },
      );
    }
    const message = error instanceof Error ? error.message : "Could not create collection";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
