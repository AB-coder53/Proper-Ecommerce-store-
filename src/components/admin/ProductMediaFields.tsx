"use client";

import { useRef, useState } from "react";
import { Loader2, Plus, Star, Trash2, Upload } from "lucide-react";

import { uploadAdminImage } from "@/components/admin/AdminFields";
import { ColorCombobox } from "@/components/admin/ColorCombobox";
import { Button } from "@/components/ui/button";
import {
  COLOR_IMAGE_LIMIT,
  PRODUCT_IMAGE_LIMIT,
  type ProductColorImages,
} from "@/lib/catalog-types";
import { colorSwatchClass, splitProductMedia } from "@/lib/product-colors";
import { cn } from "@/lib/utils";

type ColorRow = { key: string; name: string; images: string[] };

function packMedia(rows: ColorRow[], extras: string[]) {
  const named = rows.filter((row) => row.name.trim());
  const colorImages: ProductColorImages[] = named.map((row) => ({
    color: row.name.trim(),
    images: row.images
      .map((src) => src.trim())
      .filter(Boolean)
      .slice(0, COLOR_IMAGE_LIMIT),
  }));
  const packedExtras = extras.map((src) => src.trim()).filter(Boolean);
  const images = [...colorImages.flatMap((entry) => entry.images), ...packedExtras].slice(
    0,
    PRODUCT_IMAGE_LIMIT,
  );
  return {
    colors: named.map((row) => row.name.trim()),
    colorImages,
    images,
    image: images.find((src) => src.trim()) ?? "",
  };
}

function photoCount(rows: ColorRow[], extras: string[]) {
  return rows.reduce((total, row) => total + row.images.length, 0) + extras.length;
}

export function ProductMediaFields({
  colors,
  images,
  colorImages,
  onChange,
}: {
  colors: string[];
  images: string[];
  colorImages?: ProductColorImages[];
  onChange: (next: {
    colors: string[];
    colorImages: ProductColorImages[];
    images: string[];
    image: string;
  }) => void;
}) {
  const keyRef = useRef(0);
  const nextKey = () => {
    keyRef.current += 1;
    return `color-${keyRef.current}`;
  };

  const [rows, setRows] = useState<ColorRow[]>(() => {
    const split = splitProductMedia(colors, images, colorImages);
    const source = split.rows.length ? split.rows : [{ name: "", images: [] }];
    return source.map((row) => ({ ...row, key: nextKey() }));
  });
  const [extras, setExtras] = useState<string[]>(
    () => splitProductMedia(colors, images, colorImages).extras,
  );
  const [uploading, setUploading] = useState("");
  const [error, setError] = useState("");

  const usedColors = rows.map((row) => row.name).filter((name) => name.trim());
  const totalPhotos = photoCount(rows, extras);
  const remainingTotal = Math.max(0, PRODUCT_IMAGE_LIMIT - totalPhotos);

  const commit = (nextRows: ColorRow[], nextExtras: string[]) => {
    setRows(nextRows);
    setExtras(nextExtras);
    onChange(packMedia(nextRows, nextExtras));
  };

  const upload = async (files: File[], target: string) => {
    if (!files.length) return;
    setUploading(target);
    setError("");
    const urls: string[] = [];
    try {
      const room =
        target === "extra"
          ? remainingTotal
          : Math.min(
              remainingTotal,
              COLOR_IMAGE_LIMIT - (rows.find((row) => row.key === target)?.images.length ?? 0),
            );
      for (const file of files.slice(0, Math.max(0, room))) {
        urls.push(await uploadAdminImage(file));
      }
      if (!urls.length) {
        setError(
          remainingTotal <= 0
            ? `You can upload up to ${PRODUCT_IMAGE_LIMIT} photos per product.`
            : `Each colour can have up to ${COLOR_IMAGE_LIMIT} photos.`,
        );
        return;
      }
      if (target === "extra") {
        commit(rows, [...extras, ...urls]);
        return;
      }
      commit(
        rows.map((row) =>
          row.key === target
            ? { ...row, images: [...row.images, ...urls].slice(0, COLOR_IMAGE_LIMIT) }
            : row,
        ),
        extras,
      );
    } catch (err) {
      setError(err instanceof Error ? err.message : "Upload failed");
    } finally {
      setUploading("");
    }
  };

  return (
    <div className="space-y-3">
      <div>
        <p className="text-sm font-medium">Colours and photos</p>
        <p className="text-xs text-muted-foreground">
          Pick a colour and add several photos for it. The first photo is the cover used on cards
          and when shoppers select that colour. Extra shots below stay in the full gallery.
        </p>
        <p className="mt-1 text-xs text-muted-foreground">
          {totalPhotos} / {PRODUCT_IMAGE_LIMIT} photos · up to {COLOR_IMAGE_LIMIT} per colour
        </p>
      </div>

      <div className="space-y-3">
        {rows.map((row, index) => {
          const colorRoom = Math.min(remainingTotal, COLOR_IMAGE_LIMIT - row.images.length);
          return (
            <div
              key={row.key}
              className="space-y-3 rounded-2xl border border-border bg-muted/20 p-3"
            >
              <div className="flex flex-wrap items-end gap-3">
                <span
                  aria-hidden
                  className={cn(
                    "mb-2 size-8 shrink-0 rounded-full shadow-[inset_0_0_0_1px_rgba(0,0,0,0.12)]",
                    colorSwatchClass(row.name || "unknown"),
                  )}
                />
                <div className="min-w-0 flex-1 sm:max-w-xs">
                  <label className="text-xs text-muted-foreground">
                    {index === 0 ? "Colour · main" : "Colour"}
                  </label>
                  <ColorCombobox
                    value={row.name}
                    usedColors={usedColors}
                    onChange={(name) =>
                      commit(
                        rows.map((item) => (item.key === row.key ? { ...item, name } : item)),
                        extras,
                      )
                    }
                  />
                </div>
                <Button
                  type="button"
                  variant="outline"
                  className="h-10 rounded-full"
                  onClick={() => {
                    const next = rows.filter((item) => item.key !== row.key);
                    commit(next.length ? next : [{ key: nextKey(), name: "", images: [] }], extras);
                  }}
                >
                  <Trash2 className="size-4" />
                  Remove colour
                </Button>
              </div>

              <div className="flex flex-wrap gap-3">
                {row.images.map((src, imageIndex) => (
                  <div key={`${row.key}-${src}-${imageIndex}`} className="relative">
                    <img
                      src={src}
                      alt=""
                      className="h-24 w-20 rounded-lg object-cover object-top"
                    />
                    {imageIndex === 0 ? (
                      <span className="absolute bottom-1 left-1 rounded-full bg-white/90 px-1.5 py-0.5 text-[10px] font-medium">
                        Cover
                      </span>
                    ) : (
                      <button
                        type="button"
                        onClick={() =>
                          commit(
                            rows.map((item) => {
                              if (item.key !== row.key) return item;
                              const next = [...item.images];
                              const [cover] = next.splice(imageIndex, 1);
                              return cover ? { ...item, images: [cover, ...next] } : item;
                            }),
                            extras,
                          )
                        }
                        className="absolute bottom-1 left-1 inline-flex items-center gap-1 rounded-full bg-white/90 px-1.5 py-0.5 text-[10px] font-medium"
                      >
                        <Star className="size-2.5" />
                        Set as cover
                      </button>
                    )}
                    <button
                      type="button"
                      aria-label="Remove photo"
                      onClick={() =>
                        commit(
                          rows.map((item) =>
                            item.key === row.key
                              ? {
                                  ...item,
                                  images: item.images.filter(
                                    (_, nextIndex) => nextIndex !== imageIndex,
                                  ),
                                }
                              : item,
                          ),
                          extras,
                        )
                      }
                      className="absolute -top-2 -right-2 inline-flex size-7 items-center justify-center rounded-full border border-border bg-white text-destructive shadow-sm"
                    >
                      <Trash2 className="size-3.5" />
                    </button>
                  </div>
                ))}
                <label
                  className={cn("inline-flex", colorRoom <= 0 && "pointer-events-none opacity-50")}
                >
                  <input
                    type="file"
                    accept="image/png,image/jpeg,image/webp,image/gif"
                    multiple
                    disabled={colorRoom <= 0 || uploading === row.key}
                    className="hidden"
                    onChange={(event) => {
                      void upload(Array.from(event.target.files ?? []), row.key);
                      event.target.value = "";
                    }}
                  />
                  <span className="inline-flex h-24 w-20 cursor-pointer flex-col items-center justify-center gap-1 rounded-lg border border-dashed border-border bg-white text-xs font-medium">
                    {uploading === row.key ? (
                      <Loader2 className="size-4 animate-spin" />
                    ) : (
                      <Upload className="size-4" />
                    )}
                    Add photos
                  </span>
                </label>
              </div>
              <p className="text-xs text-muted-foreground">
                {row.images.length} / {COLOR_IMAGE_LIMIT} photos for this colour
              </p>
            </div>
          );
        })}
      </div>

      <Button
        type="button"
        variant="outline"
        className="rounded-full"
        onClick={() => commit([...rows, { key: nextKey(), name: "", images: [] }], extras)}
      >
        <Plus className="size-4" />
        Add colour
      </Button>

      <div className="space-y-3 pt-2">
        <div>
          <p className="text-sm font-medium">More photos</p>
          <p className="text-xs text-muted-foreground">
            Extra shots for the product gallery. These are separate from the colour photos.
          </p>
        </div>
        <div className="flex flex-wrap gap-3">
          {extras.map((src, index) => (
            <div key={`${src}-${index}`} className="relative">
              <img src={src} alt="" className="h-24 w-20 rounded-lg object-cover object-top" />
              <button
                type="button"
                aria-label="Remove photo"
                onClick={() =>
                  commit(
                    rows,
                    extras.filter((_, imageIndex) => imageIndex !== index),
                  )
                }
                className="absolute -top-2 -right-2 inline-flex size-7 items-center justify-center rounded-full border border-border bg-white text-destructive shadow-sm"
              >
                <Trash2 className="size-3.5" />
              </button>
            </div>
          ))}
          <label
            className={cn("inline-flex", remainingTotal <= 0 && "pointer-events-none opacity-50")}
          >
            <input
              type="file"
              accept="image/png,image/jpeg,image/webp,image/gif"
              multiple
              disabled={remainingTotal <= 0 || uploading === "extra"}
              className="hidden"
              onChange={(event) => {
                void upload(Array.from(event.target.files ?? []), "extra");
                event.target.value = "";
              }}
            />
            <span className="inline-flex h-24 w-20 cursor-pointer flex-col items-center justify-center gap-1 rounded-lg border border-dashed border-border bg-white text-xs font-medium">
              {uploading === "extra" ? (
                <Loader2 className="size-4 animate-spin" />
              ) : (
                <Upload className="size-4" />
              )}
              Add photo
            </span>
          </label>
        </div>
      </div>

      {error ? <p className="text-xs text-destructive">{error}</p> : null}
    </div>
  );
}
