"use client";

import { useState } from "react";
import { Loader2, Upload } from "lucide-react";

import { Button } from "@/components/ui/button";

export function ImageUploadField({
  label,
  value,
  onChange,
}: {
  label: string;
  value: string;
  onChange: (url: string) => void;
}) {
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState("");

  const onFile = async (file: File | null) => {
    if (!file) return;
    setUploading(true);
    setError("");
    try {
      const body = new FormData();
      body.append("file", file);
      const res = await fetch("/api/admin/upload", { method: "POST", body });
      const data = (await res.json()) as { url?: string; error?: string };
      if (!res.ok || !data.url) throw new Error(data.error ?? "Upload failed");
      onChange(data.url);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Upload failed");
    } finally {
      setUploading(false);
    }
  };

  return (
    <div className="space-y-2">
      <label className="text-sm font-medium">{label}</label>
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
        <input
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder="/images/product.png or upload"
          className="h-11 flex-1 rounded-xl border border-border bg-white px-3 text-sm"
        />
        <label className="inline-flex cursor-pointer">
          <input
            type="file"
            accept="image/png,image/jpeg,image/webp,image/gif"
            className="hidden"
            onChange={(e) => onFile(e.target.files?.[0] ?? null)}
          />
          <span className="inline-flex h-11 items-center gap-2 rounded-xl border border-border bg-white px-4 text-sm font-medium">
            {uploading ? (
              <Loader2 className="size-4 animate-spin" />
            ) : (
              <Upload className="size-4" />
            )}
            Upload
          </span>
        </label>
      </div>
      {value ? (
        <img src={value} alt="" className="mt-2 h-28 w-24 rounded-lg object-cover object-top" />
      ) : null}
      {error ? <p className="text-xs text-destructive">{error}</p> : null}
    </div>
  );
}

export function ListField({
  label,
  value,
  onChange,
  placeholder,
}: {
  label: string;
  value: string[];
  onChange: (next: string[]) => void;
  placeholder?: string;
}) {
  return (
    <div className="space-y-2">
      <label className="text-sm font-medium">{label}</label>
      <textarea
        value={value.join("\n")}
        onChange={(e) =>
          onChange(
            e.target.value
              .split("\n")
              .map((line) => line.trim())
              .filter(Boolean),
          )
        }
        placeholder={placeholder}
        rows={4}
        className="w-full rounded-xl border border-border bg-white px-3 py-2 text-sm"
      />
      <p className="text-xs text-muted-foreground">One item per line</p>
    </div>
  );
}

export function AdminNotice({ children }: { children: React.ReactNode }) {
  return (
    <div className="rounded-2xl border border-border bg-white px-4 py-3 text-sm text-muted-foreground">
      {children}
    </div>
  );
}

export function DangerButton({
  label,
  onConfirm,
}: {
  label: string;
  onConfirm: () => Promise<void> | void;
}) {
  const [busy, setBusy] = useState(false);
  return (
    <Button
      type="button"
      variant="destructive"
      disabled={busy}
      className="rounded-full"
      onClick={async () => {
        if (!window.confirm("Delete this item permanently?")) return;
        setBusy(true);
        try {
          await onConfirm();
        } finally {
          setBusy(false);
        }
      }}
    >
      {busy ? <Loader2 className="size-4 animate-spin" /> : null}
      {label}
    </Button>
  );
}
