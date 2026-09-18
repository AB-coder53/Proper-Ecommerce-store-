import { NextResponse } from "next/server";
import { ZodError } from "zod";

import { createReservation, reservationSchema } from "@/lib/reservations";

export async function POST(request: Request) {
  try {
    const body: unknown = await request.json();
    const data = reservationSchema.parse(body);
    const result = await createReservation(data);
    return NextResponse.json(result);
  } catch (error) {
    if (error instanceof ZodError) {
      return NextResponse.json({ error: "Invalid reservation data." }, { status: 400 });
    }
    const message =
      error instanceof Error ? error.message : "We couldn't complete your reservation right now.";
    console.error("[reservations]", error);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
