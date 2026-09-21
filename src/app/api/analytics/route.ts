import { NextResponse } from "next/server";
import { ZodError } from "zod";

import {
  analyticsEventSchema,
  isAnalyticsTableReady,
  recordAnalyticsEvent,
} from "@/lib/analytics.server";

async function readJsonBody(request: Request): Promise<unknown> {
  const contentType = request.headers.get("content-type") ?? "";
  if (contentType.includes("application/json")) {
    return request.json();
  }
  const text = await request.text();
  return text ? JSON.parse(text) : {};
}

export async function POST(request: Request) {
  try {
    if (!(await isAnalyticsTableReady())) {
      return NextResponse.json({ ok: false, skipped: true });
    }
    const body: unknown = await readJsonBody(request);
    const data = analyticsEventSchema.parse(body);
    const userAgent = request.headers.get("user-agent");
    await recordAnalyticsEvent(data, userAgent);
    return NextResponse.json({ ok: true });
  } catch (error) {
    if (error instanceof ZodError) {
      return NextResponse.json({ error: "Invalid analytics payload" }, { status: 400 });
    }
    const message = error instanceof Error ? error.message : "Could not record event";
    if (message.includes("site_analytics_events") || message.includes("Could not find the table")) {
      return NextResponse.json({ ok: false, skipped: true });
    }
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
