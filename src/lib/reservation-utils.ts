/** Reduce Indian mobile formats to a clean 10-digit number, or null if invalid. */
export function normalizeMobile(value: string): string | null {
  let digits = String(value).replace(/\D/g, "");
  if (digits.length > 10 && digits.startsWith("91")) digits = digits.slice(-10);
  if (digits.length > 10 && digits.startsWith("0")) digits = digits.slice(-10);
  return /^[6-9]\d{9}$/.test(digits) ? digits : null;
}

const ALPHABET = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";

/** AB-YYMMDD-XXXX with a random, collision-resistant suffix. */
export function makeReservationId(now = new Date()): string {
  const d = new Date(now.getTime() + 5.5 * 60 * 60 * 1000); // IST
  const stamp = `${String(d.getUTCFullYear()).slice(2)}${String(d.getUTCMonth() + 1).padStart(2, "0")}${String(d.getUTCDate()).padStart(2, "0")}`;
  let suffix = "";
  const bytes = crypto.getRandomValues(new Uint8Array(4));
  for (const b of bytes) suffix += ALPHABET[b % ALPHABET.length];
  return `AB-${stamp}-${suffix}`;
}
