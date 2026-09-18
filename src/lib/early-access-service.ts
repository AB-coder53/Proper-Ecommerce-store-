import "server-only";

import { z } from "zod";

import type { EarlyAccessResult } from "@/lib/api-types";
import { appendValues, getValues } from "@/lib/sheets.server";

export const earlyAccessSchema = z.object({
  email: z.string().trim().min(3).max(255).email(),
});

export type { EarlyAccessResult };

export async function joinEarlyAccessList(
  data: z.infer<typeof earlyAccessSchema>,
): Promise<EarlyAccessResult> {
  const email = data.email.trim().toLowerCase();
  const rows = await getValues("'Early Access Leads'!A2:A");
  const exists = rows.some((row) => (row[0] ?? "").trim().toLowerCase() === email);
  if (exists) return { status: "existing", email };

  const timestamp = new Date().toLocaleString("en-IN", { timeZone: "Asia/Kolkata" });
  await appendValues("'Early Access Leads'!A:B", [[email, timestamp]]);
  return { status: "created", email };
}
