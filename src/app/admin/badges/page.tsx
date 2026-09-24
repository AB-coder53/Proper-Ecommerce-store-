"use client";

import { useEffect, useState, type FormEvent } from "react";
import { toast } from "sonner";

import { AdminShell } from "@/components/admin/AdminShell";
import { Button } from "@/components/ui/button";
import { NativeSelect } from "@/components/ui/native-select";
import { badgeToneClass, type ProductBadge } from "@/lib/promotions";

const emptyBadge = (): ProductBadge => ({
  id: "",
  name: "",
  label: "",
  active: true,
  sortOrder: 0,
  tone: "default",
});

export default function AdminBadgesPage() {
  const [username, setUsername] = useState("Admin");
  const [badges, setBadges] = useState<ProductBadge[]>([]);
  const [form, setForm] = useState<ProductBadge>(emptyBadge());
  const [saving, setSaving] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const editing = badges.some((row) => row.id === form.id && form.id);

  const load = async () => {
    try {
      const auth = await fetch("/api/admin/auth");
      const authData = (await auth.json()) as { authenticated?: boolean; username?: string };
      if (!authData.authenticated) {
        window.location.href = "/admin/login";
        return;
      }
      if (authData.username) setUsername(authData.username);
      const res = await fetch("/api/admin/badges");
      const data = (await res.json()) as { badges?: ProductBadge[] };
      setBadges(data.badges ?? []);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void load();
  }, []);

  const onSubmit = async (event: FormEvent) => {
    event.preventDefault();
    setSaving(true);
    setError("");
    try {
      const res = await fetch(editing ? `/api/admin/badges/${form.id}` : "/api/admin/badges", {
        method: editing ? "PUT" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });
      const data = (await res.json()) as { error?: string };
      if (!res.ok) throw new Error(data.error ?? "Save failed");
      toast.success(editing ? "Badge updated" : "Badge created");
      setForm(emptyBadge());
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Save failed");
    } finally {
      setSaving(false);
    }
  };

  return (
    <AdminShell username={username}>
      <h1 className="font-display text-3xl font-bold">Badges</h1>
      <p className="mt-1 text-sm text-muted-foreground">
        Create labels and assign them on product pages. Sold Out is still driven by live inventory.
      </p>

      <form
        onSubmit={onSubmit}
        className="mt-8 grid gap-4 rounded-3xl border border-border bg-white p-6 sm:grid-cols-2"
      >
        <label className="space-y-2 text-sm">
          <span className="font-medium">ID</span>
          <input
            required
            disabled={editing}
            value={form.id}
            onChange={(event) => setForm((prev) => ({ ...prev, id: event.target.value }))}
            className="h-11 w-full rounded-xl border border-border px-3 disabled:bg-muted"
          />
        </label>
        <label className="space-y-2 text-sm">
          <span className="font-medium">Name</span>
          <input
            required
            value={form.name}
            onChange={(event) => setForm((prev) => ({ ...prev, name: event.target.value }))}
            className="h-11 w-full rounded-xl border border-border px-3"
          />
        </label>
        <label className="space-y-2 text-sm">
          <span className="font-medium">Storefront label</span>
          <input
            required
            value={form.label}
            onChange={(event) => setForm((prev) => ({ ...prev, label: event.target.value }))}
            className="h-11 w-full rounded-xl border border-border px-3"
          />
        </label>
        <label className="space-y-2 text-sm">
          <span className="font-medium">Tone</span>
          <NativeSelect
            value={form.tone}
            onChange={(event) =>
              setForm((prev) => ({ ...prev, tone: event.target.value as ProductBadge["tone"] }))
            }
          >
            <option value="default">Default</option>
            <option value="teal">Teal</option>
            <option value="ink">Ink</option>
            <option value="sale">Sale</option>
          </NativeSelect>
        </label>
        <label className="flex items-center gap-2 text-sm">
          <input
            type="checkbox"
            checked={form.active}
            onChange={(event) => setForm((prev) => ({ ...prev, active: event.target.checked }))}
          />
          Active
        </label>
        {error ? <p className="text-sm text-destructive sm:col-span-2">{error}</p> : null}
        <div className="sm:col-span-2">
          <Button disabled={saving} className="rounded-full bg-teal text-teal-foreground">
            {editing ? "Update badge" : "Create badge"}
          </Button>
        </div>
      </form>

      <div className="mt-8 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {loading ? (
          <p className="text-sm text-muted-foreground">Loading badges...</p>
        ) : badges.length ? (
          badges.map((badge) => (
            <div key={badge.id} className="rounded-3xl border border-border bg-white p-5">
              <span
                className={`rounded-full px-3 py-1 text-xs font-semibold uppercase ${badgeToneClass(badge.tone)}`}
              >
                {badge.label}
              </span>
              <p className="mt-3 font-medium">{badge.name}</p>
              <p className="text-xs text-muted-foreground">
                {badge.active ? "Active" : "Inactive"}
              </p>
              <div className="mt-4 flex gap-3 text-sm">
                <button className="font-semibold text-teal" onClick={() => setForm(badge)}>
                  Edit
                </button>
                <button
                  className="text-destructive"
                  onClick={async () => {
                    if (!window.confirm("Delete this badge?")) return;
                    await fetch(`/api/admin/badges/${badge.id}`, { method: "DELETE" });
                    await load();
                  }}
                >
                  Delete
                </button>
              </div>
            </div>
          ))
        ) : (
          <p className="text-sm text-muted-foreground">No badges configured.</p>
        )}
      </div>
    </AdminShell>
  );
}
