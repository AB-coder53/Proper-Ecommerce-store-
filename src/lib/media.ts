export const PRODUCT_IMAGES_BUCKET = "product-images";
export const CATALOG_IMAGE_FOLDER = "catalog";

function supabaseUrl() {
  return (process.env["NEXT_PUBLIC_SUPABASE_URL"] || process.env["SUPABASE_URL"] || "").replace(
    /\/$/,
    "",
  );
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
