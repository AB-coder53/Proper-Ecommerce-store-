import { randomUUID } from "crypto";
import { NextResponse } from "next/server";

import { requireAdminSession } from "@/lib/admin-auth.server";
import { getSupabaseWriteClient } from "@/lib/supabase-catalog.server";

export const dynamic = "force-dynamic";

const BUCKET = "product-images";
const MAX_BYTES = 12 * 1024 * 1024;

const MIME_EXT: Record<string, string> = {
  "image/jpeg": "jpg",
  "image/png": "png",
  "image/webp": "webp",
  "image/gif": "gif",
};

function sniffMime(bytes: Uint8Array) {
  if (bytes.length >= 3 && bytes[0] === 0xff && bytes[1] === 0xd8 && bytes[2] === 0xff) {
    return "image/jpeg";
  }
  if (
    bytes.length >= 8 &&
    bytes[0] === 0x89 &&
    bytes[1] === 0x50 &&
    bytes[2] === 0x4e &&
    bytes[3] === 0x47
  ) {
    return "image/png";
  }
  if (bytes.length >= 6 && bytes[0] === 0x47 && bytes[1] === 0x49 && bytes[2] === 0x46) {
    return "image/gif";
  }
  if (
    bytes.length >= 12 &&
    bytes[0] === 0x52 &&
    bytes[1] === 0x49 &&
    bytes[2] === 0x46 &&
    bytes[3] === 0x46 &&
    bytes[8] === 0x57 &&
    bytes[9] === 0x45 &&
    bytes[10] === 0x42 &&
    bytes[11] === 0x50
  ) {
    return "image/webp";
  }
  return "";
}

async function storageClient() {
  const sb = getSupabaseWriteClient();
  const existing = await sb.storage.getBucket(BUCKET);
  const options = {
    public: true,
    fileSizeLimit: MAX_BYTES,
    allowedMimeTypes: Object.keys(MIME_EXT),
  };
  if (existing.data) {
    await sb.storage.updateBucket(BUCKET, options);
    return sb;
  }
  const created = await sb.storage.createBucket(BUCKET, options);
  if (created.error && !/already exists/i.test(created.error.message)) {
    throw created.error;
  }
  return sb;
}

export async function POST(request: Request) {
  try {
    await requireAdminSession();
    const form = await request.formData();
    const file = form.get("file");
    if (!(file instanceof File)) {
      return NextResponse.json({ error: "No file uploaded." }, { status: 400 });
    }
    if (file.size > MAX_BYTES) {
      return NextResponse.json({ error: "File must be under 12MB." }, { status: 400 });
    }

    const bytes = new Uint8Array(await file.arrayBuffer());
    const mime = MIME_EXT[file.type] ? file.type : sniffMime(bytes);
    const ext = MIME_EXT[mime];
    if (!ext) {
      return NextResponse.json({ error: "Only JPG, PNG, WEBP or GIF allowed." }, { status: 400 });
    }

    const filename = `products/${Date.now()}-${randomUUID().slice(0, 8)}.${ext}`;
    const sb = await storageClient();
    const uploaded = await sb.storage.from(BUCKET).upload(filename, bytes, {
      contentType: mime,
      upsert: false,
    });
    if (uploaded.error) {
      throw uploaded.error;
    }

    const { data } = sb.storage.from(BUCKET).getPublicUrl(filename);
    if (!data.publicUrl) {
      return NextResponse.json(
        { error: "Image stored, but the public URL is missing." },
        { status: 500 },
      );
    }
    return NextResponse.json({ url: data.publicUrl });
  } catch (error) {
    if (error instanceof Error && error.message === "Unauthorized") {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    console.error("[admin/upload]", error);
    const message = error instanceof Error ? error.message : "Upload failed.";
    return NextResponse.json(
      { error: message && message !== "Upload failed." ? message : "Upload failed." },
      { status: 500 },
    );
  }
}
