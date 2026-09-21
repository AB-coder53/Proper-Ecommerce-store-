"use client";

const COLOR_SWATCH: Record<string, string> = {
  black: "bg-neutral-900",
  white: "bg-white border border-border",
  beige: "bg-[#d4c4a8]",
  lavender: "bg-[#c8b6e2]",
  maroon: "bg-[#6b2d3c]",
  brown: "bg-[#6b4c3b]",
  "coffee brown": "bg-[#6b4c3b]",
  grey: "bg-neutral-400",
  gray: "bg-neutral-400",
  "olive green": "bg-[#556b2f]",
  green: "bg-[#4a7c59]",
};

export function colorSwatchClass(color: string) {
  const key = color.trim().toLowerCase();
  if (COLOR_SWATCH[key]) return COLOR_SWATCH[key];

  const lastWord = key.split(" ").pop() ?? key;
  if (COLOR_SWATCH[lastWord]) return COLOR_SWATCH[lastWord];

  return "bg-muted border border-border";
}

function scoreImageForColor(file: string, color: string) {
  const needle = color.trim().toLowerCase();
  const slug = needle.replace(/\s+/g, "-");
  const words = needle.split(/\s+/).filter((word) => word.length >= 3);

  let score = 0;
  if (file.includes(slug)) score += 20;
  for (const word of words) {
    if (file.includes(word)) score += 10;
  }
  return score;
}

/** All gallery indices that belong to a colour label. */
export function getImageIndicesForColor(color: string, colors: string[], images: string[]) {
  const scored = images
    .map((src, index) => ({
      index,
      score: scoreImageForColor(src.toLowerCase(), color),
    }))
    .filter((entry) => entry.score > 0)
    .sort((a, b) => b.score - a.score || a.index - b.index);

  if (scored.length > 0) {
    return scored.map((entry) => entry.index);
  }

  const orderIndex = colors.indexOf(color);
  if (orderIndex >= 0 && orderIndex < images.length) {
    return [orderIndex];
  }

  return [0];
}

/** Primary gallery image for a colour swatch. */
export function colorToImageIndex(color: string, colors: string[], images: string[]) {
  return getImageIndicesForColor(color, colors, images)[0] ?? 0;
}

/** Resolve which colour label owns a gallery image index. */
export function indexToColor(index: number, colors: string[], images: string[]) {
  for (const color of colors) {
    if (getImageIndicesForColor(color, colors, images).includes(index)) {
      return color;
    }
  }
  return colors[0] ?? "";
}
