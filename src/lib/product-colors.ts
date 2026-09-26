import type { ProductColorImages } from "@/lib/catalog-types";

export const PRODUCT_COLOR_NAMES = [
  "Black",
  "White",
  "Off White",
  "Ivory",
  "Cream",
  "Beige",
  "Sand",
  "Khaki",
  "Camel",
  "Tan",
  "Brown",
  "Coffee Brown",
  "Chocolate",
  "Walnut",
  "Maroon",
  "Burgundy",
  "Wine",
  "Red",
  "Coral",
  "Rust",
  "Terracotta",
  "Orange",
  "Mustard",
  "Yellow",
  "Gold",
  "Olive",
  "Olive Green",
  "Sage",
  "Green",
  "Forest",
  "Bottle Green",
  "Mint",
  "Teal",
  "Navy",
  "Blue",
  "Light Blue",
  "Sky Blue",
  "Cobalt",
  "Indigo",
  "Purple",
  "Lavender",
  "Lilac",
  "Pink",
  "Blush",
  "Rose",
  "Grey",
  "Light Grey",
  "Charcoal",
  "Slate",
  "Silver",
  "Peach",
] as const;

const COLOR_SWATCH: Record<string, string> = {
  black: "bg-neutral-900",
  white: "bg-white border border-border",
  "off white": "bg-[#f6f3ec] border border-border",
  ivory: "bg-[#f7f1e3]",
  cream: "bg-[#f3ead7]",
  beige: "bg-[#d4c4a8]",
  sand: "bg-[#d8c3a5]",
  khaki: "bg-[#c3b091]",
  camel: "bg-[#c19a6b]",
  tan: "bg-[#c4a484]",
  brown: "bg-[#6b4c3b]",
  "coffee brown": "bg-[#6b4c3b]",
  chocolate: "bg-[#4a2f24]",
  walnut: "bg-[#5c4033]",
  maroon: "bg-[#6b2d3c]",
  burgundy: "bg-[#6e2430]",
  wine: "bg-[#722f37]",
  red: "bg-[#b23a3a]",
  coral: "bg-[#e07a6b]",
  rust: "bg-[#a24c2d]",
  terracotta: "bg-[#c36b45]",
  orange: "bg-[#d9762c]",
  mustard: "bg-[#c4a035]",
  yellow: "bg-[#e2c15a]",
  gold: "bg-[#c4a35a]",
  olive: "bg-[#556b2f]",
  "olive green": "bg-[#556b2f]",
  sage: "bg-[#9caf88]",
  green: "bg-[#4a7c59]",
  forest: "bg-[#2f4f3e]",
  "bottle green": "bg-[#0b3d2e]",
  mint: "bg-[#b7d7c5]",
  teal: "bg-[#3d7a74]",
  navy: "bg-[#1e3a5f]",
  blue: "bg-[#3b6ea5]",
  "light blue": "bg-[#9ec5e8]",
  "sky blue": "bg-[#87b8d9]",
  cobalt: "bg-[#2b4b8c]",
  indigo: "bg-[#3f3d74]",
  purple: "bg-[#6d4c8d]",
  lavender: "bg-[#c8b6e2]",
  lilac: "bg-[#c7a8d2]",
  pink: "bg-[#e7b7c6]",
  blush: "bg-[#e8c4c4]",
  rose: "bg-[#d48a9b]",
  grey: "bg-neutral-400",
  gray: "bg-neutral-400",
  "light grey": "bg-neutral-300",
  "light gray": "bg-neutral-300",
  charcoal: "bg-[#3a3a3a]",
  slate: "bg-[#6b7280]",
  silver: "bg-[#c0c4c8] border border-border",
  peach: "bg-[#f2c4a8]",
  "lava grey": "bg-[#6b6b6b]",
};

export function parseColorImages(value: unknown): ProductColorImages[] {
  if (!Array.isArray(value)) return [];
  const rows: ProductColorImages[] = [];
  for (const entry of value) {
    if (!entry || typeof entry !== "object") continue;
    const record = entry as { color?: unknown; images?: unknown };
    const color = typeof record.color === "string" ? record.color.trim() : "";
    if (!color) continue;
    const images = Array.isArray(record.images)
      ? record.images.filter((src): src is string => typeof src === "string" && Boolean(src.trim()))
      : [];
    rows.push({ color, images });
  }
  return rows;
}

export function colorsMatch(left: string, right: string) {
  return left.trim().toLowerCase() === right.trim().toLowerCase();
}

function findColorImagesEntry(color: string, colorImages?: ProductColorImages[]) {
  if (!colorImages?.length) return undefined;
  return colorImages.find((entry) => colorsMatch(entry.color, color));
}

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

/** Gallery indices that still have a photo. */
export function visibleImageIndexes(images: string[]) {
  return images.flatMap((src, index) => (src.trim() ? [index] : []));
}

export type ProductMediaRow = { name: string; images: string[] };

/** When colour mapping is missing, recover grouped uploads (2 photos per colour, etc.). */
export function inferColorImagesFromGallery(
  colors: string[],
  images: string[],
): ProductColorImages[] {
  const photos = images.map((src) => src.trim()).filter(Boolean);
  const names = colors.map((color) => color.trim()).filter(Boolean);
  if (!names.length || photos.length < names.length) return [];
  if (photos.length % names.length !== 0) return [];
  const perColor = photos.length / names.length;
  if (perColor < 1 || perColor > 12) return [];
  return names.map((color, index) => ({
    color,
    images: photos.slice(index * perColor, (index + 1) * perColor),
  }));
}

export function resolveColorImages(
  colors: string[],
  images: string[],
  colorImages?: ProductColorImages[],
) {
  if (colorImages?.some((entry) => entry.images.some((src) => src.trim()))) {
    return colorImages.map((entry) => ({
      color: entry.color,
      images: entry.images.map((src) => src.trim()).filter(Boolean),
    }));
  }
  return inferColorImagesFromGallery(colors, images);
}

/** Pair each colour with its photos. Extra shots stay in `extras`. */
export function splitProductMedia(
  colors: string[],
  images: string[],
  colorImages?: ProductColorImages[],
): { rows: ProductMediaRow[]; extras: string[] } {
  const resolved = resolveColorImages(colors, images, colorImages);
  if (resolved.length) {
    const used = new Set<string>();
    const rows = (colors.length ? colors : resolved.map((entry) => entry.color)).map((name) => {
      const match = findColorImagesEntry(name, resolved);
      const rowImages = (match?.images ?? []).filter((src) => src.trim());
      rowImages.forEach((src) => used.add(src));
      return { name, images: rowImages };
    });
    return {
      rows,
      extras: images.filter((src) => src.trim() && !used.has(src)),
    };
  }

  const used = new Set<number>();
  const rows = colors.map((name) => ({ name, images: [] as string[] }));

  for (const row of rows) {
    const match = images
      .map((src, index) => ({
        index,
        src,
        score: src.trim() ? scoreImageForColor(src.toLowerCase(), row.name) : 0,
      }))
      .filter((entry) => entry.score > 0 && !used.has(entry.index))
      .sort((a, b) => b.score - a.score || a.index - b.index)[0];
    if (!match) continue;
    used.add(match.index);
    row.images = [match.src];
  }

  rows.forEach((row, index) => {
    const src = images[index]?.trim() ?? "";
    if (row.images.length || !src || used.has(index)) return;
    used.add(index);
    row.images = [src];
  });

  return {
    rows,
    extras: images.flatMap((src, index) => (src.trim() && !used.has(index) ? [src] : [])),
  };
}

function indicesFromColorImages(
  color: string,
  images: string[],
  colorImages?: ProductColorImages[],
) {
  const entry = findColorImagesEntry(color, colorImages);
  if (!entry?.images.length) return [];
  return entry.images.flatMap((src) => {
    const index = images.findIndex((image) => image === src);
    return index >= 0 ? [index] : [];
  });
}

/** All gallery indices that belong to a colour label. */
export function getImageIndicesForColor(
  color: string,
  colors: string[],
  images: string[],
  colorImages?: ProductColorImages[],
) {
  const resolved = resolveColorImages(colors, images, colorImages);
  const mapped = indicesFromColorImages(color, images, resolved);
  if (mapped.length > 0) return mapped;

  const scored = images
    .map((src, index) => ({
      index,
      score: src.trim() ? scoreImageForColor(src.toLowerCase(), color) : 0,
    }))
    .filter((entry) => entry.score > 0)
    .sort((a, b) => b.score - a.score || a.index - b.index);

  if (scored.length > 0) {
    return scored.map((entry) => entry.index);
  }

  const orderIndex = colors.indexOf(color);
  if (orderIndex >= 0 && images[orderIndex]?.trim()) {
    return [orderIndex];
  }

  const fallback = images.findIndex((src) => src.trim());
  return [fallback >= 0 ? fallback : 0];
}

/** Primary gallery image for a colour swatch. */
export function colorToImageIndex(
  color: string,
  colors: string[],
  images: string[],
  colorImages?: ProductColorImages[],
) {
  return getImageIndicesForColor(color, colors, images, colorImages)[0] ?? 0;
}

/** Resolve which colour label owns a gallery image index. */
export function indexToColor(
  index: number,
  colors: string[],
  images: string[],
  colorImages?: ProductColorImages[],
) {
  const src = images[index] ?? "";
  const resolved = resolveColorImages(colors, images, colorImages);
  if (src && resolved.length) {
    const owner = resolved.find((entry) => entry.images.includes(src));
    if (owner) return owner.color;
  }

  for (const color of colors) {
    if (getImageIndicesForColor(color, colors, images, resolved).includes(index)) {
      return color;
    }
  }
  return colors[0] ?? "";
}
