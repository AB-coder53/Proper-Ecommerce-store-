import "server-only";

import { z } from "zod";

import { supabaseAdmin } from "@/integrations/supabase/client.server";

export const leadSchema = z.object({
  fullName: z.string().trim().min(2, "Please enter your name").max(100),
  mobile: z
    .string()
    .trim()
    .regex(/^[6-9]\d{9}$/, "Enter a valid 10-digit Indian mobile number"),
  email: z.string().trim().email("Enter a valid email").max(255).optional().or(z.literal("")),
  city: z.string().trim().max(80).optional().or(z.literal("")),
  products: z.array(z.string().max(60)).min(1, "Select at least one product").max(10),
  size: z.string().trim().max(10).optional().or(z.literal("")),
  color: z.string().trim().max(40).optional().or(z.literal("")),
  quantity: z.number().int().min(1).max(10).default(1),
  whatsappOptIn: z.boolean().default(true),
  marketingConsent: z.boolean().default(false),
  source: z.string().trim().max(60).optional().or(z.literal("")),
});

export type LeadInput = z.input<typeof leadSchema>;

export async function registerLead(data: z.infer<typeof leadSchema>) {
  const discountCode = `AB10-${data.mobile.slice(-4)}${Math.random()
    .toString(36)
    .slice(2, 5)
    .toUpperCase()}`;

  const { error } = await supabaseAdmin.from("prelaunch_leads").insert({
    full_name: data.fullName,
    mobile: data.mobile,
    email: data.email || null,
    city: data.city || null,
    products: data.products,
    preferred_size: data.size || null,
    preferred_color: data.color || null,
    quantity: data.quantity,
    whatsapp_optin: data.whatsappOptIn,
    marketing_consent: data.marketingConsent,
    discount_code: discountCode,
    source: data.source || null,
  });

  if (error) {
    console.error("[prelaunch_leads] insert failed", error.message);
    throw new Error("We couldn't save your registration. Please try again.");
  }

  return { ok: true as const, discountCode };
}
