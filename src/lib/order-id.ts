const ALPHABET = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";

/** Order ID: ABO-YYMMDD-XXXX (distinct from reservation AB-YYMMDD-XXXX). */
export function makeOrderNumber(now = new Date()): string {
  const d = new Date(now.getTime() + 5.5 * 60 * 60 * 1000); // IST
  const stamp = `${String(d.getUTCFullYear()).slice(2)}${String(d.getUTCMonth() + 1).padStart(2, "0")}${String(d.getUTCDate()).padStart(2, "0")}`;
  let suffix = "";
  const bytes = crypto.getRandomValues(new Uint8Array(4));
  for (const b of bytes) suffix += ALPHABET[b % ALPHABET.length]!;
  return `ABO-${stamp}-${suffix}`;
}
