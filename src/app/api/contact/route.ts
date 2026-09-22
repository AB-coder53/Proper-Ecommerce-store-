import { NextResponse } from "next/server";
import { z, ZodError } from "zod";

import { notifyStoreInquiry } from "@/lib/notifications.server";

const contactSchema = z.object({
  name: z.string().trim().min(2, "Please enter your name").max(100),
  email: z.string().trim().email("Enter a valid email").max(255),
  phone: z.string().trim().max(20).optional().or(z.literal("")),
  message: z.string().trim().min(10, "Please enter a short message").max(2000),
});

export async function POST(request: Request) {
  try {
    const data = contactSchema.parse(await request.json());
    const result = await notifyStoreInquiry({
      type: "contact",
      subject: `Contact form — ${data.name}`,
      replyTo: data.email,
      lines: [
        `Name: ${data.name}`,
        `Email: ${data.email}`,
        `Phone: ${data.phone || "n/a"}`,
        "",
        "Message:",
        data.message,
      ],
    });
    if (!result.ok) {
      return NextResponse.json(
        { error: "We couldn't send your message right now. Please email us directly." },
        { status: 503 },
      );
    }
    return NextResponse.json({ ok: true });
  } catch (error) {
    if (error instanceof ZodError) {
      return NextResponse.json(
        { error: error.issues[0]?.message || "Please check the form and try again." },
        { status: 400 },
      );
    }
    console.error("[contact]", error);
    return NextResponse.json(
      { error: "We couldn't send your message right now. Please try again." },
      { status: 500 },
    );
  }
}
