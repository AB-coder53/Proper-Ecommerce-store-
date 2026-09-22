import "server-only";

import { randomUUID } from "crypto";

import { supabaseAdmin } from "@/integrations/supabase/client.server";
import { appendValues } from "@/lib/sheets.server";
import { isMissingTableError } from "@/lib/store-config.shared";

export type ContactInquiry = {
  name: string;
  email: string;
  phone?: string;
  message: string;
};

export async function saveContactInquiry(data: ContactInquiry): Promise<boolean> {
  const saved = await Promise.allSettled([
    saveToDatabase(data),
    saveToAnalytics(data),
    saveToSheet(data),
  ]);
  const ok = saved.some((result) => result.status === "fulfilled" && result.value);
  if (!ok) {
    for (const result of saved) {
      if (result.status === "rejected") {
        console.error("[contact] save failed", result.reason);
      }
    }
  }
  return ok;
}

async function saveToDatabase(data: ContactInquiry): Promise<boolean> {
  const { error } = await supabaseAdmin.from("contact_inquiries" as never).insert({
    id: randomUUID(),
    name: data.name,
    email: data.email,
    phone: data.phone?.trim() || null,
    message: data.message,
  } as never);
  if (!error) return true;
  if (isMissingTableError(error)) {
    console.error("[contact] contact_inquiries table is missing");
    return false;
  }
  console.error("[contact] supabase insert failed", error.message);
  return false;
}

async function saveToAnalytics(data: ContactInquiry): Promise<boolean> {
  const { error } = await supabaseAdmin.from("site_analytics_events").insert({
    event_type: "click",
    path: "/contact",
    event_name: "contact_inquiry",
    session_id: randomUUID(),
    metadata: {
      name: data.name,
      email: data.email,
      phone: data.phone?.trim() || "",
      message: data.message,
    },
  });
  if (!error) return true;
  console.error("[contact] analytics insert failed", error.message);
  return false;
}

async function saveToSheet(data: ContactInquiry): Promise<boolean> {
  const timestamp = new Date().toLocaleString("en-IN", { timeZone: "Asia/Kolkata" });
  await appendValues("'Contact Inquiries'!A:E", [
    [timestamp, data.name, data.email, data.phone?.trim() || "", data.message],
  ]);
  return true;
}
