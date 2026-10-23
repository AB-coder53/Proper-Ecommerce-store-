"use client";

import { useEffect, useState, type FormEvent } from "react";
import { Pencil } from "lucide-react";
import { toast } from "sonner";

import {
  AdminDeleteButton,
  AdminIconActions,
  AdminIconButton,
  AdminList,
} from "@/components/admin/AdminList";
import { AdminPageHeader } from "@/components/admin/AdminPageHeader";
import { StatusPill } from "@/components/admin/StatusPill";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
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
  const [badges, setBadges] = useState<ProductBadge[]>([]);
  const [form, setForm] = useState<ProductBadge>(emptyBadge());
  const [saving, setSaving] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [open, setOpen] = useState(false);
  const editing = badges.some((row) => row.id === form.id && form.id);

  const closeForm = () => {
    setOpen(false);
    setForm(emptyBadge());
    setError("");
  };

  const load = async () => {
    try {
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
      closeForm();
      await load();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Save failed");
    } finally {
      setSaving(false);
    }
  };

  return (
    <>
      <AdminPageHeader
        title="Badges"
        description="Create labels and assign them on product pages. Sold Out is still driven by live inventory."
        actions={
          <Button
            type="button"
            className="rounded-full bg-teal text-teal-foreground hover:bg-teal/90"
            onClick={() => {
              setForm(emptyBadge());
              setError("");
              setOpen(true);
            }}
          >
            Add badge
          </Button>
        }
      />

      <Dialog
        open={open}
        onOpenChange={(next) => {
          if (!next) closeForm();
          else setOpen(true);
        }}
      >
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>{editing ? "Edit badge" : "Add badge"}</DialogTitle>
            <DialogDescription>
              This label can be assigned on a product. It shows on the product page.
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={onSubmit} className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="badge-id">ID</Label>
              <Input
                id="badge-id"
                required
                disabled={editing}
                value={form.id}
                onChange={(event) => setForm((prev) => ({ ...prev, id: event.target.value }))}
                className="h-11 rounded-xl bg-white"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="badge-name">Name</Label>
              <Input
                id="badge-name"
                required
                value={form.name}
                onChange={(event) => setForm((prev) => ({ ...prev, name: event.target.value }))}
                className="h-11 rounded-xl bg-white"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="badge-label">Storefront label</Label>
              <Input
                id="badge-label"
                required
                value={form.label}
                onChange={(event) => setForm((prev) => ({ ...prev, label: event.target.value }))}
                className="h-11 rounded-xl bg-white"
              />
            </div>
            <div className="space-y-2">
              <Label>Tone</Label>
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
            </div>
            <label className="flex items-center gap-2 text-sm">
              <Checkbox
                checked={form.active}
                onCheckedChange={(checked) =>
                  setForm((prev) => ({ ...prev, active: checked === true }))
                }
              />
              Active
            </label>
            {error ? <p className="text-sm text-destructive sm:col-span-2">{error}</p> : null}
            <div className="sm:col-span-2">
              <Button disabled={saving} className="rounded-full bg-teal text-teal-foreground">
                {saving ? "Saving..." : editing ? "Update badge" : "Create badge"}
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>

      <AdminList
        rows={badges}
        rowKey={(badge) => badge.id}
        placeholder="Search badges"
        loading={loading}
        empty="No badges configured."
        getSearchText={(badge) => `${badge.name} ${badge.label} ${badge.id} ${badge.tone}`}
        columns={[
          {
            header: "Label",
            cell: (badge) => (
              <span
                className={`rounded-full px-3 py-1 text-xs font-semibold uppercase ${badgeToneClass(badge.tone)}`}
              >
                {badge.label}
              </span>
            ),
          },
          { header: "Name", cell: (badge) => badge.name },
          {
            header: "Status",
            cell: (badge) => (
              <StatusPill status={badge.active ? "active" : "inactive"}>
                {badge.active ? "Active" : "Inactive"}
              </StatusPill>
            ),
          },
          {
            header: "Actions",
            className: "w-24 text-right",
            cell: (badge) => (
              <AdminIconActions>
                <AdminIconButton
                  label="Edit"
                  onClick={() => {
                    setForm(badge);
                    setError("");
                    setOpen(true);
                  }}
                >
                  <Pencil className="size-4" />
                </AdminIconButton>
                <AdminDeleteButton
                  onClick={async () => {
                    if (!window.confirm("Delete this badge?")) return;
                    await fetch(`/api/admin/badges/${badge.id}`, { method: "DELETE" });
                    await load();
                  }}
                />
              </AdminIconActions>
            ),
          },
        ]}
      />
    </>
  );
}
