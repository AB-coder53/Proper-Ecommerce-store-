import { NextResponse } from "next/server";
import { ZodError } from "zod";

import { requireAdminSession } from "@/lib/admin-auth.server";
import { deleteCollection, getCollectionById, saveCollection } from "@/lib/catalog.server";
import { collectionSchema } from "@/lib/catalog-types";

type Ctx = { params: Promise<{ id: string }> };

export async function GET(_: Request, ctx: Ctx) {
  try {
    await requireAdminSession();
    const { id } = await ctx.params;
    const collection = await getCollectionById(id);
    if (!collection) return NextResponse.json({ error: "Not found" }, { status: 404 });
    return NextResponse.json({ collection });
  } catch {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
}

export async function PUT(request: Request, ctx: Ctx) {
  try {
    await requireAdminSession();
    const { id } = await ctx.params;
    const body: unknown = await request.json();
    const parsed = collectionSchema.parse(body);
    if (parsed.id !== id) {
      return NextResponse.json({ error: "Collection id cannot be changed." }, { status: 400 });
    }
    const saved = await saveCollection(parsed, "update");
    return NextResponse.json({ collection: saved });
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
    const message = error instanceof Error ? error.message : "Could not update collection";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}

export async function DELETE(_: Request, ctx: Ctx) {
  try {
    await requireAdminSession();
    const { id } = await ctx.params;
    await deleteCollection(id);
    return NextResponse.json({ ok: true });
  } catch (error) {
    if (error instanceof Error && error.message === "Unauthorized") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    const message = error instanceof Error ? error.message : "Could not delete collection";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
