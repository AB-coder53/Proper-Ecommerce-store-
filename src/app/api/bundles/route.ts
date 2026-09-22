import { NextResponse } from "next/server";

import { getActiveBundleViews } from "@/lib/store-offers.server";

export const revalidate = 60;

export async function GET() {
  const bundles = await getActiveBundleViews();
  return NextResponse.json({ bundles });
}
