/** Parse display prices like "₹799/-" or "₹1,499" into whole INR rupees. */
export function parsePriceInr(value: string | number | null | undefined): number {
  if (typeof value === "number" && Number.isFinite(value)) return Math.max(0, Math.round(value));
  const digits = String(value ?? "").replace(/[^\d]/g, "");
  if (!digits) return 0;
  return Math.max(0, Number.parseInt(digits, 10));
}

export function formatInr(amount: number): string {
  return `₹${Math.max(0, Math.round(amount)).toLocaleString("en-IN")}`;
}
