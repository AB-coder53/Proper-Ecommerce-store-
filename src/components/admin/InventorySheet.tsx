"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { toast } from "sonner";

import { StatusPill } from "@/components/admin/StatusPill";
import {
  AlertDialog,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

export type InventorySizeCell = {
  variantId: string | null;
  stock: number;
  offered: boolean;
};

export type InventoryColorRow = {
  key: string;
  productId: string;
  productName: string;
  category: string;
  color: string;
  image: string;
  opening: number;
  sizes: Record<string, InventorySizeCell>;
};

type PendingChange = {
  row: InventoryColorRow;
  size: string;
  from: number;
  to: number;
  revert: () => void;
};

function rowTotal(row: InventoryColorRow, columns: string[]) {
  return columns.reduce(
    (sum, size) => sum + (row.sizes[size]?.offered ? (row.sizes[size]?.stock ?? 0) : 0),
    0,
  );
}

function stockStatus(current: number, opening: number) {
  if (current <= 0) return "Out of Stock";
  if (current < opening) return "Low Stock";
  return "In Stock";
}

function StockField({
  value,
  disabled,
  label,
  onRequest,
}: {
  value: number;
  disabled: boolean;
  label: string;
  onRequest: (next: number, revert: () => void) => void;
}) {
  const [draft, setDraft] = useState(String(value));

  useEffect(() => {
    setDraft(String(value));
  }, [value]);

  const commit = () => {
    if (draft.trim() === "") {
      setDraft(String(value));
      return;
    }
    const parsed = Number(draft);
    if (!Number.isInteger(parsed) || parsed < 0 || parsed > 99999 || parsed === value) {
      setDraft(String(value));
      return;
    }
    onRequest(parsed, () => setDraft(String(value)));
  };

  return (
    <Input
      type="number"
      min={0}
      max={99999}
      inputMode="numeric"
      aria-label={label}
      value={draft}
      disabled={disabled}
      onChange={(event) => setDraft(event.target.value)}
      onBlur={commit}
      onKeyDown={(event) => {
        if (event.key === "Enter") event.currentTarget.blur();
      }}
      className="h-8 w-16 rounded-full px-2 text-center text-sm tabular-nums [appearance:textfield] [&::-webkit-inner-spin-button]:appearance-none [&::-webkit-outer-spin-button]:appearance-none"
    />
  );
}

export function InventorySheet({
  initialRows,
  columns,
}: {
  initialRows: InventoryColorRow[];
  columns: string[];
}) {
  const [rows, setRows] = useState(initialRows);
  const [query, setQuery] = useState("");
  const [busyKey, setBusyKey] = useState("");
  const [pending, setPending] = useState<PendingChange | null>(null);
  const ignoreClose = useRef(false);

  const visible = useMemo(() => {
    const needle = query.trim().toLowerCase();
    if (!needle) return rows;
    return rows.filter((row) =>
      `${row.productName} ${row.category} ${row.color}`.toLowerCase().includes(needle),
    );
  }, [query, rows]);

  const updateStock = async (row: InventoryColorRow, size: string, stock: number) => {
    const cell = row.sizes[size];
    if (!cell?.offered || cell.stock === stock) return;
    const key = `${row.key}:${size}`;
    setBusyKey(key);
    setRows((current) =>
      current.map((item) =>
        item.key === row.key
          ? { ...item, sizes: { ...item.sizes, [size]: { ...cell, stock } } }
          : item,
      ),
    );
    try {
      const res = await fetch("/api/admin/inventory", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          productId: row.productId,
          color: row.color,
          size,
          stock,
        }),
      });
      const data = (await res.json()) as { variantId?: string; stock?: number; error?: string };
      if (!res.ok) throw new Error(data.error || "Could not update stock.");
      setRows((current) =>
        current.map((item) =>
          item.key === row.key
            ? {
                ...item,
                sizes: {
                  ...item.sizes,
                  [size]: {
                    offered: true,
                    stock: data.stock ?? stock,
                    variantId: data.variantId ?? cell.variantId,
                  },
                },
              }
            : item,
        ),
      );
      toast.success(`${row.productName} · ${row.color} · ${size} is now ${data.stock ?? stock}.`);
    } catch (error) {
      setRows((current) =>
        current.map((item) =>
          item.key === row.key ? { ...item, sizes: { ...item.sizes, [size]: cell } } : item,
        ),
      );
      toast.error(error instanceof Error ? error.message : "Could not update stock.");
    } finally {
      setBusyKey("");
    }
  };

  const requestChange = (change: PendingChange) => {
    setPending((current) => {
      current?.revert();
      return change;
    });
  };

  const confirmChange = async () => {
    if (!pending) return;
    ignoreClose.current = true;
    const change = pending;
    setPending(null);
    await updateStock(change.row, change.size, change.to);
    ignoreClose.current = false;
  };

  return (
    <div className="mt-8 space-y-3">
      <Input
        value={query}
        onChange={(event) => setQuery(event.target.value)}
        placeholder="Search product, category, or colour"
        className="h-10 max-w-sm rounded-full bg-white"
      />
      <div className="overflow-x-auto rounded-2xl border border-border bg-white">
        <Table className="min-w-[980px]">
          <TableHeader>
            <TableRow>
              <TableHead>Product</TableHead>
              <TableHead>Colour</TableHead>
              <TableHead className="text-center">Opening</TableHead>
              {columns.map((size) => (
                <TableHead key={size} className="text-center">
                  {size}
                </TableHead>
              ))}
              <TableHead className="text-center">Current total</TableHead>
              <TableHead>Stock status</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {visible.length ? (
              visible.map((row) => {
                const current = rowTotal(row, columns);
                const status = stockStatus(current, row.opening);
                return (
                  <TableRow key={row.key}>
                    <TableCell>
                      <div className="flex items-center gap-3">
                        <img
                          src={row.image}
                          alt=""
                          className="size-12 rounded-lg object-cover object-top"
                        />
                        <div>
                          <p className="font-medium">{row.productName}</p>
                          <p className="text-xs text-muted-foreground">{row.category}</p>
                        </div>
                      </div>
                    </TableCell>
                    <TableCell>{row.color}</TableCell>
                    <TableCell className="text-center tabular-nums">{row.opening}</TableCell>
                    {columns.map((size) => {
                      const cell = row.sizes[size];
                      if (!cell?.offered) {
                        return (
                          <TableCell key={size} className="text-center text-muted-foreground">
                            —
                          </TableCell>
                        );
                      }
                      return (
                        <TableCell key={size} className="text-center">
                          <StockField
                            value={cell.stock}
                            disabled={busyKey === `${row.key}:${size}`}
                            label={`${row.productName} ${row.color} size ${size} stock`}
                            onRequest={(next, revert) =>
                              requestChange({ row, size, from: cell.stock, to: next, revert })
                            }
                          />
                        </TableCell>
                      );
                    })}
                    <TableCell className="text-center font-semibold tabular-nums">
                      {current}
                    </TableCell>
                    <TableCell>
                      <StatusPill status={status}>{status}</StatusPill>
                    </TableCell>
                  </TableRow>
                );
              })
            ) : (
              <TableRow>
                <TableCell
                  colSpan={5 + columns.length}
                  className="h-24 text-center text-muted-foreground"
                >
                  {query.trim() ? "No matches." : "No inventory yet."}
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>

      <AlertDialog
        open={Boolean(pending)}
        onOpenChange={(open) => {
          if (open || ignoreClose.current) return;
          pending?.revert();
          setPending(null);
        }}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Change this inventory?</AlertDialogTitle>
            <AlertDialogDescription>
              {pending
                ? `Update ${pending.row.productName}, ${pending.row.color}, size ${pending.size} from ${pending.from} to ${pending.to}.`
                : "Update this stock count."}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel className="rounded-full">Keep current count</AlertDialogCancel>
            <Button type="button" className="rounded-full" onClick={() => void confirmChange()}>
              Update inventory
            </Button>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
