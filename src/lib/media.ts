export const PRODUCT_IMAGES_BUCKET = "product-images";
export const CATALOG_IMAGE_FOLDER = "catalog";

function supabaseUrl() {
  return (process.env["NEXT_PUBLIC_SUPABASE_URL"] || process.env["SUPABASE_URL"] || "").replace(
    /\/$/,
    "",
  );
}

/** Public buckets that may be served through the `/media` CDN proxy. */
export const MEDIA_BUCKETS = new Set([PRODUCT_IMAGES_BUCKET, "product-uploads"]);
export const MEDIA_PROXY_MAX_BYTES = 4 * 1024 * 1024;

const PUBLIC_OBJECT_PATH = "/storage/v1/object/public/";

export function supabasePublicObjectUrl(bucket: string, objectPath: string): string | null {
  const base = supabaseUrl();
  if (!base) return null;
  return `${base}${PUBLIC_OBJECT_PATH}${bucket}/${objectPath.replace(/^\/+/, "")}`;
}

/**
 * Rewrites a Supabase public Storage URL to the same-origin `/media` proxy so
 * browsers and crawlers download it from Vercel's CDN instead of Supabase.
 */
export function cdnImageUrl(src: string | null | undefined): string {
  if (!src || !src.includes(PUBLIC_OBJECT_PATH)) return src ?? "";
  try {
    const url = new URL(src);
    if (!url.hostname.endsWith(".supabase.co") && !url.hostname.endsWith(".supabase.in")) {
      return src;
    }
    const rest = url.pathname.slice(
      url.pathname.indexOf(PUBLIC_OBJECT_PATH) + PUBLIC_OBJECT_PATH.length,
    );
    const bucket = rest.split("/")[0] ?? "";
    if (!MEDIA_BUCKETS.has(bucket)) return src;
    return `/media/${rest}${url.search}`;
  } catch {
    return src;
  }
}

export function storagePublicUrl(objectPath: string): string {
  const base = supabaseUrl();
  const path = objectPath.replace(/^\/+/, "");
  if (!base) return `/${path}`;
  return `${base}/storage/v1/object/public/${PRODUCT_IMAGES_BUCKET}/${path}`;
}

/** Public Storage URL for a file that used to live in /public/images. */
export function catalogImageUrl(filename: string): string {
  const name = filename.replace(/^\/images\//, "").replace(/^\/+/, "");
  return storagePublicUrl(`${CATALOG_IMAGE_FOLDER}/${name}`);
}

export function resolveMediaUrl(src: string): string {
  const value = src.trim();
  if (!value) return value;
  if (/^https?:\/\//i.test(value)) return value;
  if (value.startsWith("/images/")) return catalogImageUrl(value);
  return value;
}

export function resolveMediaUrls(src: string[] | null | undefined): string[] {
  return (src ?? []).map(resolveMediaUrl);
}
