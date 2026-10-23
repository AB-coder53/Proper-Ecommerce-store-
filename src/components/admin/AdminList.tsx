"use client";

import Link from "next/link";
import { useState, type ReactNode } from "react";
import { Eye, Pencil, Trash2 } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Input } from "@/components/ui/input";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

export type AdminColumn<T> = {
  header: string;
  className?: string;
  cell: (row: T) => ReactNode;
};

export function AdminList<T>({
  rows,
  columns,
  getSearchText,
  rowKey,
  empty,
  placeholder = "Search",
  toolbar,
  footer,
  hideSearch = false,
  loading = false,
}: {
  rows: T[];
  columns: AdminColumn<T>[];
  getSearchText: (row: T) => string;
  rowKey: (row: T) => string;
  empty: string;
  placeholder?: string;
  toolbar?: ReactNode;
  footer?: ReactNode;
  hideSearch?: boolean;
  loading?: boolean;
}) {
  const [query, setQuery] = useState("");
  const needle = query.trim().toLowerCase();
  const filtered =
    hideSearch || !needle
      ? rows
      : rows.filter((row) => getSearchText(row).toLowerCase().includes(needle));

  return (
    <div className="mt-8 space-y-3">
      {hideSearch && !toolbar ? null : (
        <div className="flex flex-wrap items-center gap-3">
          {hideSearch ? null : (
            <Input
              value={query}
              onChange={(event) => setQuery(event.target.value)}
              placeholder={placeholder}
              className="h-10 max-w-sm rounded-full bg-white"
            />
          )}
          {toolbar}
        </div>
      )}
      <div className="rounded-2xl border border-border bg-white">
        <Table>
          <TableHeader>
            <TableRow>
              {columns.map((column) => (
                <TableHead key={column.header} className={column.className}>
                  {column.header}
                </TableHead>
              ))}
            </TableRow>
          </TableHeader>
          <TableBody>
            {loading && rows.length === 0 ? (
              Array.from({ length: 6 }, (_, row) => (
                <TableRow key={`skeleton-${row}`}>
                  {columns.map((column) => (
                    <TableCell key={column.header} className={column.className}>
                      <Skeleton className="h-4 w-full max-w-40 bg-foreground/10" />
                    </TableCell>
                  ))}
                </TableRow>
              ))
            ) : filtered.length ? (
              filtered.map((row) => (
                <TableRow key={rowKey(row)}>
                  {columns.map((column) => (
                    <TableCell key={column.header} className={column.className}>
                      {column.cell(row)}
                    </TableCell>
                  ))}
                </TableRow>
              ))
            ) : (
              <TableRow>
                <TableCell
                  colSpan={columns.length}
                  className="h-24 text-center text-muted-foreground"
                >
                  {!hideSearch && query.trim() ? "No matches." : empty}
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
        {footer ? (
          <div className="border-t border-border px-4 py-3 text-xs text-muted-foreground">
            {footer}
          </div>
        ) : null}
      </div>
    </div>
  );
}

export function AdminIconActions({ children }: { children: ReactNode }) {
  return <div className="flex items-center justify-end gap-0.5">{children}</div>;
}

export function AdminEditLink({ href, label = "Edit" }: { href: string; label?: string }) {
  return (
    <Button asChild variant="ghost" size="icon" className="size-8 text-muted-foreground">
      <Link href={href} aria-label={label} title={label}>
        <Pencil className="size-4" />
      </Link>
    </Button>
  );
}

export function AdminViewLink({ href, label = "View" }: { href: string; label?: string }) {
  return (
    <Button asChild variant="ghost" size="icon" className="size-8 text-muted-foreground">
      <Link href={href} aria-label={label} title={label}>
        <Eye className="size-4" />
      </Link>
    </Button>
  );
}

export function AdminIconButton({
  label,
  onClick,
  disabled = false,
  destructive = false,
  children,
}: {
  label: string;
  onClick: () => void;
  disabled?: boolean;
  destructive?: boolean;
  children: ReactNode;
}) {
  return (
    <Button
      type="button"
      variant="ghost"
      size="icon"
      className={`size-8 text-muted-foreground${destructive ? " hover:text-destructive" : ""}`}
      aria-label={label}
      title={label}
      disabled={disabled}
      onClick={onClick}
    >
      {children}
    </Button>
  );
}

export function AdminDeleteButton({
  onClick,
  label = "Delete",
  disabled = false,
}: {
  onClick: () => void;
  label?: string;
  disabled?: boolean;
}) {
  return (
    <Button
      type="button"
      variant="ghost"
      size="icon"
      className="size-8 text-muted-foreground hover:text-destructive"
      aria-label={label}
      title={label}
      disabled={disabled}
      onClick={onClick}
    >
      <Trash2 className="size-4" />
    </Button>
  );
}
