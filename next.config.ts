import type { NextConfig } from "next";

function supabaseHostname() {
  const raw = process.env["NEXT_PUBLIC_SUPABASE_URL"] || process.env["SUPABASE_URL"];
  if (!raw) return null;
  try {
    return new URL(raw).hostname;
  } catch {
    return null;
  }
}

const supabaseHost = supabaseHostname();

const nextConfig: NextConfig = {
  poweredByHeader: false,
  images: {
    // Hobby includes 5,000 image transformations. Each product photo and size
    // counts, which paused the project at 5.9K. Photos are served from Supabase.
    unoptimized: true,
    formats: ["image/avif", "image/webp"],
    qualities: [75, 90, 95],
    deviceSizes: [640, 828, 1080, 1200],
    imageSizes: [64, 96, 128, 256, 384],
    remotePatterns: [
      ...(supabaseHost
        ? [
            {
              protocol: "https" as const,
              hostname: supabaseHost,
              pathname: "/storage/v1/object/public/**",
            },
          ]
        : []),
      {
        protocol: "https",
        hostname: "**.supabase.co",
        pathname: "/storage/v1/object/public/**",
      },
    ],
  },
};

export default nextConfig;
