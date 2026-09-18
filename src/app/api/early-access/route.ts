import { NextResponse } from "next/server";
import { ZodError } from "zod";

import { earlyAccessSchema, joinEarlyAccessList } from "@/lib/early-access-service";

export async function POST(request: Request) {
  try {
    const body: unknown = await request.json();
    const data = earlyAccessSchema.parse(body);
    const result = await joinEarlyAccessList(data);
    return NextResponse.json(result);
  } catch (error) {
    if (error instanceof ZodError) {
      return NextResponse.json({ error: "Please enter a valid email address." }, { status: 400 });
    }
    console.error("[early-access]", error);
    return NextResponse.json(
      { error: "We couldn't save your email right now. Please try again." },
      { status: 500 },
    );
  }
}
