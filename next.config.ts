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
    formats: ["image/avif", "image/webp"],
    qualities: [75, 90, 95],
    deviceSizes: [640, 750, 828, 1080, 1200, 1440, 1920, 2048, 2560],
    imageSizes: [64, 80, 96, 128, 160, 256, 384, 512],
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
