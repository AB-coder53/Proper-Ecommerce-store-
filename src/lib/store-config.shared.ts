export function isMissingTableError(error: unknown): boolean {
  if (!error || typeof error !== "object") return false;
  const code = "code" in error ? String((error as { code?: unknown }).code ?? "") : "";
  const message = "message" in error ? String((error as { message?: unknown }).message ?? "") : "";
  return (
    code === "PGRST205" ||
    code === "42P01" ||
    message.includes("Could not find the table") ||
    message.includes("does not exist")
  );
}
