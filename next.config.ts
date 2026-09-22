import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  poweredByHeader: false,
  images: {
    formats: ["image/avif", "image/webp"],
    deviceSizes: [320, 360, 375, 390, 414, 430, 640, 750, 828, 1080, 1200],
    imageSizes: [64, 80, 96, 128, 160, 256, 384],
  },
};

export default nextConfig;
