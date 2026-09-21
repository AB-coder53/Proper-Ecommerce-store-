import { NextResponse } from "next/server";

import { getAdminSession } from "@/lib/admin-auth.server";
import { getCatalog } from "@/lib/catalog.server";

export async function GET() {
  const catalog = await getCatalog();
  return NextResponse.json(catalog, {
    headers: { "Cache-Control": "public, s-maxage=30, stale-while-revalidate=120" },
  });
}

export async function HEAD() {
  const session = await getAdminSession();
  return new NextResponse(null, { status: session ? 204 : 401 });
}
