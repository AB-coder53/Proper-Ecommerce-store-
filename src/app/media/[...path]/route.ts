import { MEDIA_BUCKETS, MEDIA_PROXY_MAX_BYTES, supabasePublicObjectUrl } from "@/lib/media";

// Serves public Storage objects through Vercel's CDN. Supabase is only hit on a
// CDN miss, so product photos stop counting against Supabase cached egress.
// Uploads use unique filenames, so a long edge cache is safe.
const CACHE_CONTROL = "public, max-age=604800, s-maxage=31536000, stale-while-revalidate=86400";

export async function GET(_request: Request, { params }: { params: Promise<{ path: string[] }> }) {
  const [bucket, ...rest] = (await params).path;
  if (
    !bucket ||
    !MEDIA_BUCKETS.has(bucket) ||
    !rest.length ||
    rest[0] === "meta" ||
    rest.some((s) => s === ".." || s === ".")
  ) {
    return new Response("Not found", { status: 404 });
  }

  const origin = supabasePublicObjectUrl(bucket, rest.map(encodeURIComponent).join("/"));
  if (!origin) return new Response("Not found", { status: 404 });

  const upstream = await fetch(origin, { cache: "no-store" });
  if (!upstream.ok || !upstream.body) {
    return new Response("Not found", {
      status: upstream.status === 404 || upstream.status === 400 ? 404 : 502,
      headers: { "Cache-Control": "public, max-age=60, s-maxage=60" },
    });
  }

  const contentType = upstream.headers.get("content-type") ?? "";
  if (!contentType.startsWith("image/")) {
    return new Response("Not found", { status: 404 });
  }

  // Vercel functions cannot return bodies over ~4.5MB; send large files straight to Storage.
  const length = Number(upstream.headers.get("content-length") ?? 0);
  if (length > MEDIA_PROXY_MAX_BYTES) {
    await upstream.body.cancel();
    return Response.redirect(origin, 307);
  }

  const headers = new Headers({
    "Content-Type": contentType,
    "Cache-Control": CACHE_CONTROL,
    "CDN-Cache-Control": "public, max-age=31536000",
    "X-Content-Type-Options": "nosniff",
  });
  const etag = upstream.headers.get("etag");
  if (etag) headers.set("ETag", etag);
  const lastModified = upstream.headers.get("last-modified");
  if (lastModified) headers.set("Last-Modified", lastModified);
  if (length) headers.set("Content-Length", String(length));

  return new Response(upstream.body, { status: 200, headers });
}
