import { after, NextResponse } from "next/server";
import { ZodError } from "zod";

import { notifyStoreInquiry } from "@/lib/notifications.server";
import { createReservation, reservationSchema } from "@/lib/reservations";

export async function POST(request: Request) {
  try {
    const body: unknown = await request.json();
    const data = reservationSchema.parse(body);
    const result = await createReservation(data);
    const replyTo = data.email?.trim();
    after(() => {
      void notifyStoreInquiry({
        type: "reservation",
        subject: `Reservation ${result.reservationId ?? "inquiry"} — ${data.fullName}`,
        ...(replyTo ? { replyTo } : {}),
        lines: [
          `Status: ${result.status}`,
          `Reservation ID: ${result.reservationId ?? "n/a"}`,
          `Name: ${data.fullName}`,
          `Mobile: ${data.mobile}`,
          `Email: ${data.email || "n/a"}`,
          `City: ${data.city || "n/a"}`,
          `WhatsApp opt-in: ${data.whatsappOptIn ? "Yes" : "No"}`,
          "",
          "Items:",
          ...data.items.map((item) => `- ${item.productName} · ${item.colour} · ${item.size}`),
        ],
      });
    });
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
