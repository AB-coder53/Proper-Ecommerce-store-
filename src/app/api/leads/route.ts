import { NextResponse } from "next/server";
import { ZodError } from "zod";

import { leadSchema, registerLead } from "@/lib/leads";

export async function POST(request: Request) {
  try {
    const body: unknown = await request.json();
    const data = leadSchema.parse(body);
    const result = await registerLead(data);
    return NextResponse.json(result);
  } catch (error) {
    if (error instanceof ZodError) {
      return NextResponse.json({ error: "Invalid registration data." }, { status: 400 });
    }
    const message =
      error instanceof Error
        ? error.message
        : "We couldn't save your registration. Please try again.";
    console.error("[leads]", error);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
