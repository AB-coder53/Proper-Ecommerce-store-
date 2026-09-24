"use client";

import { useRef, useState } from "react";
import { Loader2, Plus, Trash2, Upload } from "lucide-react";

import { uploadAdminImage } from "@/components/admin/AdminFields";
import { Button } from "@/components/ui/button";
import { colorSwatchClass, splitProductMedia } from "@/lib/product-colors";
import { cn } from "@/lib/utils";

type ColorRow = { key: string; name: string; image: string };

function packMedia(rows: ColorRow[], extras: string[]) {
  const named = rows.filter((row) => row.name.trim());
  const images = [...named.map((row) => row.image.trim()), ...extras.map((src) => src.trim())];
  while (images.length > 0 && !images[images.length - 1]) images.pop();
  return {
    colors: named.map((row) => row.name.trim()),
    images,
    image: images.find((src) => src.trim()) ?? "",
  };
}

export function ProductMediaFields({
  colors,
  images,
  onChange,
}: {
  colors: string[];
  images: string[];
  onChange: (next: { colors: string[]; images: string[]; image: string }) => void;
}) {
  const keyRef = useRef(0);
  const nextKey = () => {
    keyRef.current += 1;
    return `color-${keyRef.current}`;
  };

  const [rows, setRows] = useState<ColorRow[]>(() => {
    const split = splitProductMedia(colors, images);
    const source = split.rows.length ? split.rows : [{ name: "", image: "" }];
    return source.map((row) => ({ ...row, key: nextKey() }));
  });
  const [extras, setExtras] = useState<string[]>(() => splitProductMedia(colors, images).extras);
  const [uploading, setUploading] = useState("");
  const [error, setError] = useState("");

  const commit = (nextRows: ColorRow[], nextExtras: string[]) => {
    setRows(nextRows);
    setExtras(nextExtras);
    onChange(packMedia(nextRows, nextExtras));
  };

  const upload = async (file: File | null, target: string) => {
    if (!file) return;
    setUploading(target);
    setError("");
    try {
      const url = await uploadAdminImage(file);
      if (target.startsWith("extra")) {
        commit(rows, [...extras, url]);
        return;
      }
      commit(
        rows.map((row) => (row.key === target ? { ...row, image: url } : row)),
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
          Add each colour with its photo. Remove a photo without deleting the colour. The circles on
          the product card use these colour names, and the first photo is the main image.
        </p>
      </div>

      <div className="space-y-3">
        {rows.map((row, index) => (
          <div
            key={row.key}
            className="grid gap-3 rounded-2xl border border-border bg-muted/20 p-3 sm:grid-cols-[auto_1fr_auto]"
          >
            <div className="flex items-center gap-3">
              <span
                aria-hidden
                className={cn(
                  "size-8 shrink-0 rounded-full shadow-[inset_0_0_0_1px_rgba(0,0,0,0.12)]",
                  colorSwatchClass(row.name || "unknown"),
                )}
              />
              <div className="min-w-0 flex-1 sm:w-44 sm:flex-none">
                <label className="text-xs text-muted-foreground">
                  {index === 0 ? "Colour · main" : "Colour"}
                </label>
                <input
                  value={row.name}
                  onChange={(event) =>
                    commit(
                      rows.map((item) =>
                        item.key === row.key ? { ...item, name: event.target.value } : item,
                      ),
                      extras,
                    )
                  }
                  placeholder="Black"
                  className="mt-1 h-11 w-full rounded-xl border border-border bg-white px-3 text-sm"
                />
              </div>
            </div>

            <div className="flex items-center gap-3">
              {row.image ? (
                <img
                  src={row.image}
                  alt=""
                  className="h-16 w-14 rounded-lg object-cover object-top"
                />
              ) : (
                <div className="flex h-16 w-14 items-center justify-center rounded-lg border border-dashed border-border text-[10px] text-muted-foreground">
                  No photo
                </div>
              )}
              <div className="flex flex-wrap gap-2">
                <label className="inline-flex cursor-pointer">
                  <input
                    type="file"
                    accept="image/png,image/jpeg,image/webp,image/gif"
                    className="hidden"
                    onChange={(event) => {
                      void upload(event.target.files?.[0] ?? null, row.key);
                      event.target.value = "";
                    }}
                  />
                  <span className="inline-flex h-10 items-center gap-2 rounded-full border border-border bg-white px-4 text-sm font-medium">
                    {uploading === row.key ? (
                      <Loader2 className="size-4 animate-spin" />
                    ) : (
                      <Upload className="size-4" />
                    )}
                    {row.image ? "Replace" : "Upload"}
                  </span>
                </label>
                {row.image ? (
                  <Button
                    type="button"
                    variant="outline"
                    className="h-10 rounded-full"
                    onClick={() =>
                      commit(
                        rows.map((item) => (item.key === row.key ? { ...item, image: "" } : item)),
                        extras,
                      )
                    }
                  >
                    Remove photo
                  </Button>
                ) : null}
              </div>
            </div>

            <div className="flex items-center sm:justify-end">
              <Button
                type="button"
                variant="outline"
                className="h-10 rounded-full"
                onClick={() => {
                  const next = rows.filter((item) => item.key !== row.key);
                  commit(next.length ? next : [{ key: nextKey(), name: "", image: "" }], extras);
                }}
              >
                <Trash2 className="size-4" />
                Remove colour
              </Button>
            </div>
          </div>
        ))}
      </div>

      <Button
        type="button"
        variant="outline"
        className="rounded-full"
        onClick={() => commit([...rows, { key: nextKey(), name: "", image: "" }], extras)}
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
          <label className="inline-flex cursor-pointer">
            <input
              type="file"
              accept="image/png,image/jpeg,image/webp,image/gif"
              className="hidden"
              onChange={(event) => {
                void upload(event.target.files?.[0] ?? null, "extra");
                event.target.value = "";
              }}
            />
            <span className="inline-flex h-24 w-20 flex-col items-center justify-center gap-1 rounded-lg border border-dashed border-border bg-white text-xs font-medium">
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
