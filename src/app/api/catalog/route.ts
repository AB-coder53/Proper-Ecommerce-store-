import { NextResponse } from "next/server";

import { getAdminSession } from "@/lib/admin-auth.server";
import { getCatalog, invalidateCatalogCache } from "@/lib/catalog.server";

export async function GET(request: Request) {
  const live = new URL(request.url).searchParams.has("live");
  if (live) invalidateCatalogCache();
  const catalog = await getCatalog();
  return NextResponse.json(catalog, {
    headers: {
      "Cache-Control": live ? "no-store" : "public, s-maxage=60, stale-while-revalidate=120",
    },
  });
}

export async function HEAD() {
  const session = await getAdminSession();
  return new NextResponse(null, { status: session ? 204 : 401 });
}
