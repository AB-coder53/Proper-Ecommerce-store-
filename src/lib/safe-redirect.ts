const INTERNAL_ORIGIN = "https://abcollection.internal";

/** Returns a same-origin app path, or fallback. Rejects protocol-relative and off-site URLs. */
export function safeInternalPath(value?: string | null, fallback = "/"): string {
  if (!value) return fallback;
  const trimmed = value.trim();
  if (!trimmed.startsWith("/") || trimmed.startsWith("//") || trimmed.includes("\\")) {
    return fallback;
  }
  if (/^[a-zA-Z][a-zA-Z+.-]*:/.test(trimmed)) return fallback;
  try {
    const url = new URL(trimmed, INTERNAL_ORIGIN);
    if (url.origin !== INTERNAL_ORIGIN) return fallback;
    const next = `${url.pathname}${url.search}${url.hash}`;
    if (!next.startsWith("/") || next.startsWith("//")) return fallback;
    return next;
  } catch {
    return fallback;
  }
}
