/**
 * Canonical production origin for sitemap, robots, metadata, and structured data.
 * Intentionally hard-coded — never read from NEXT_PUBLIC_SITE_URL (avoids localhost in SEO).
 */
export const CANONICAL_SITE_ORIGIN = "https://www.abcollection.co.in";

export function canonicalUrl(path = "/"): string {
  if (path.startsWith("http://") || path.startsWith("https://")) {
    return path;
  }

  const normalized = path.startsWith("/") ? path : `/${path}`;
  return normalized === "/" ? `${CANONICAL_SITE_ORIGIN}/` : `${CANONICAL_SITE_ORIGIN}${normalized}`;
}
