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
  "light grey": "bg-neutral-300",
  "light gray": "bg-neutral-300",
  "olive green": "bg-[#556b2f]",
  olive: "bg-[#556b2f]",
  green: "bg-[#4a7c59]",
  navy: "bg-[#1e3a5f]",
  blue: "bg-[#3b6ea5]",
  "light blue": "bg-[#9ec5e8]",
  red: "bg-[#b23a3a]",
  pink: "bg-[#e7b7c6]",
  yellow: "bg-[#e2c15a]",
  mustard: "bg-[#c4a035]",
  orange: "bg-[#d9762c]",
  purple: "bg-[#6d4c8d]",
  cream: "bg-[#f3ead7]",
  ivory: "bg-[#f7f1e3]",
  charcoal: "bg-[#3a3a3a]",
  khaki: "bg-[#c3b091]",
  sand: "bg-[#d8c3a5]",
  rust: "bg-[#a24c2d]",
  burgundy: "bg-[#6e2430]",
  camel: "bg-[#c19a6b]",
  tan: "bg-[#c4a484]",
  teal: "bg-[#3d7a74]",
  gold: "bg-[#c4a35a]",
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

/** Gallery indices that still have a photo. */
export function visibleImageIndexes(images: string[]) {
  return images.flatMap((src, index) => (src.trim() ? [index] : []));
}

/** Pair each colour with its photo. Extra shots stay in `extras`. */
export function splitProductMedia(colors: string[], images: string[]) {
  const used = new Set<number>();
  const rows = colors.map((name) => ({ name, image: "" }));

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
    row.image = match.src;
  }

  rows.forEach((row, index) => {
    const src = images[index]?.trim() ?? "";
    if (row.image || !src || used.has(index)) return;
    used.add(index);
    row.image = src;
  });

  return {
    rows,
    extras: images.flatMap((src, index) => (src.trim() && !used.has(index) ? [src] : [])),
  };
}

/** All gallery indices that belong to a colour label. */
export function getImageIndicesForColor(color: string, colors: string[], images: string[]) {
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
