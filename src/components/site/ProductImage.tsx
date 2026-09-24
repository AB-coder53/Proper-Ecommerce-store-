"use client";

import Image from "next/image";

import { cn } from "@/lib/utils";

function isLocalSrc(src: string) {
  return src.startsWith("/") && !src.startsWith("//");
}

function isOptimizableRemote(src: string) {
  try {
    const host = new URL(src).hostname;
    return host.endsWith(".supabase.co") || host.endsWith(".supabase.in");
  } catch {
    return false;
  }
}

export function ProductImage({
  src,
  alt,
  width = 800,
  height = 1000,
  className,
  sizes = "(max-width: 430px) 100vw, (max-width: 1024px) 50vw, 33vw",
  priority = false,
}: {
  src: string;
  alt: string;
  width?: number;
  height?: number;
  className?: string;
  sizes?: string;
  priority?: boolean;
}) {
  const safe = src || "/favicon.png";
  if (!isLocalSrc(safe) && !isOptimizableRemote(safe)) {
    return (
      <img
        src={safe}
        alt={alt}
        width={width}
        height={height}
        className={className}
        loading={priority ? "eager" : "lazy"}
        decoding="async"
      />
    );
  }

  return (
    <Image
      src={safe}
      alt={alt}
      width={width}
      height={height}
      sizes={sizes}
      className={cn(className)}
      priority={priority}
    />
  );
}
