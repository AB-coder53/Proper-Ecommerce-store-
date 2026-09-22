export async function readJsonBody<T>(response: Response): Promise<T> {
  return (await response.json().catch(() => ({}))) as T;
}

export function apiErrorMessage(payload: unknown, fallback: string) {
  if (!payload || typeof payload !== "object") return fallback;
  const row = payload as { error?: unknown; message?: unknown };
  const error = typeof row.error === "string" ? row.error.trim() : "";
  const message = typeof row.message === "string" ? row.message.trim() : "";
  return error || message || fallback;
}
