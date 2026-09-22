import { after, NextResponse } from "next/server";
import { ZodError } from "zod";

import { leadSchema, registerLead } from "@/lib/leads";
import { notifyStoreInquiry } from "@/lib/notifications.server";

export async function POST(request: Request) {
  try {
    const body: unknown = await request.json();
    const data = leadSchema.parse(body);
    const result = await registerLead(data);
    const replyTo = data.email?.trim();
    after(() => {
      void notifyStoreInquiry({
        type: "lead",
        subject: `Launch registration — ${data.fullName}`,
        ...(replyTo ? { replyTo } : {}),
        lines: [
          `Name: ${data.fullName}`,
          `Mobile: ${data.mobile}`,
          `Email: ${data.email || "n/a"}`,
          `City: ${data.city || "n/a"}`,
          `Products: ${data.products.join(", ")}`,
          `Size: ${data.size || "n/a"}`,
          `Color: ${data.color || "n/a"}`,
          `Quantity: ${data.quantity}`,
          `WhatsApp opt-in: ${data.whatsappOptIn ? "Yes" : "No"}`,
          `Discount code: ${result.discountCode}`,
          `Source: ${data.source || "n/a"}`,
        ],
      });
    });
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
