"use client";

import { usePathname } from "next/navigation";

import { Skeleton } from "@/components/ui/skeleton";

const bone = "bg-foreground/10";

function HeaderSkeleton({ action = true }: { action?: boolean }) {
  return (
    <div className="flex flex-wrap items-start justify-between gap-4">
      <div className="space-y-2">
        <Skeleton className={`h-9 w-48 ${bone}`} />
        <Skeleton className={`h-4 w-72 max-w-full ${bone}`} />
      </div>
      {action ? <Skeleton className={`h-10 w-32 rounded-full ${bone}`} /> : null}
    </div>
  );
}

function TableSkeleton() {
  return (
    <>
      <HeaderSkeleton />
      <div className="mt-8 space-y-3">
        <Skeleton className={`h-10 w-full max-w-sm rounded-full ${bone}`} />
        <div className="overflow-hidden rounded-2xl border border-border bg-white">
          <div className="grid grid-cols-4 gap-4 border-b px-4 py-3">
            {Array.from({ length: 4 }, (_, index) => (
              <Skeleton key={index} className={`h-3 w-16 ${bone}`} />
            ))}
          </div>
          {Array.from({ length: 8 }, (_, row) => (
            <div
              key={row}
              className="grid grid-cols-4 items-center gap-4 border-b px-4 py-3 last:border-0"
            >
              <Skeleton className={`h-4 w-32 ${bone}`} />
              <Skeleton className={`h-4 w-20 ${bone}`} />
              <Skeleton className={`h-5 w-16 rounded-full ${bone}`} />
              <Skeleton className={`ml-auto size-8 rounded-md ${bone}`} />
            </div>
          ))}
        </div>
      </div>
    </>
  );
}

function FormSkeleton() {
  return (
    <>
      <HeaderSkeleton action={false} />
      <div className="mt-8 rounded-xl border bg-white p-6">
        <div className="grid gap-4 sm:grid-cols-2">
          {Array.from({ length: 6 }, (_, index) => (
            <div key={index} className="space-y-2">
              <Skeleton className={`h-3 w-24 ${bone}`} />
              <Skeleton className={`h-11 w-full rounded-xl ${bone}`} />
            </div>
          ))}
        </div>
        <Skeleton className={`mt-6 h-11 w-36 rounded-full ${bone}`} />
      </div>
    </>
  );
}

function DashboardSkeleton() {
  return (
    <>
      <HeaderSkeleton />
      <div className="mt-8 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {Array.from({ length: 4 }, (_, index) => (
          <div key={index} className="rounded-xl border bg-white p-6">
            <Skeleton className={`h-3 w-24 ${bone}`} />
            <Skeleton className={`mt-4 h-8 w-28 ${bone}`} />
            <Skeleton className={`mt-2 h-3 w-20 ${bone}`} />
          </div>
        ))}
      </div>
      <div className="mt-6 grid gap-4 lg:grid-cols-2">
        {Array.from({ length: 2 }, (_, panel) => (
          <div key={panel} className="rounded-xl border bg-white p-6">
            <Skeleton className={`h-6 w-36 ${bone}`} />
            <div className="mt-4 space-y-3">
              {Array.from({ length: 4 }, (_, row) => (
                <Skeleton key={row} className={`h-12 w-full rounded-xl ${bone}`} />
              ))}
            </div>
          </div>
        ))}
      </div>
    </>
  );
}

function AnalyticsSkeleton() {
  return (
    <>
      <HeaderSkeleton action={false} />
      <div className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {Array.from({ length: 4 }, (_, index) => (
          <div key={index} className="rounded-xl border bg-white p-6">
            <Skeleton className={`h-3 w-24 ${bone}`} />
            <Skeleton className={`mt-4 h-8 w-24 ${bone}`} />
          </div>
        ))}
      </div>
      <div className="mt-8 rounded-xl border bg-white p-6">
        <Skeleton className={`h-6 w-48 ${bone}`} />
        <Skeleton className={`mt-6 h-72 w-full rounded-xl ${bone}`} />
      </div>
    </>
  );
}

function EditorSkeleton() {
  return (
    <>
      <HeaderSkeleton action={false} />
      <div className="mt-8 rounded-xl border bg-white p-6">
        <div className="grid gap-4 sm:grid-cols-2">
          {Array.from({ length: 4 }, (_, index) => (
            <div key={index} className="space-y-2">
              <Skeleton className={`h-3 w-24 ${bone}`} />
              <Skeleton className={`h-11 w-full rounded-xl ${bone}`} />
            </div>
          ))}
        </div>
        <Skeleton className={`mt-6 h-28 w-full rounded-xl ${bone}`} />
        <Skeleton className={`mt-6 h-11 w-36 rounded-full ${bone}`} />
      </div>
      <div className="mt-8 overflow-hidden rounded-2xl border border-border bg-white">
        {Array.from({ length: 4 }, (_, row) => (
          <div key={row} className="border-b px-4 py-3 last:border-0">
            <Skeleton className={`h-4 w-2/3 ${bone}`} />
          </div>
        ))}
      </div>
    </>
  );
}

function kindFor(pathname: string) {
  if (pathname === "/admin") return "dashboard";
  if (pathname === "/admin/analytics") return "analytics";
  if (
    pathname === "/admin/badges" ||
    pathname === "/admin/coupons" ||
    pathname === "/admin/reviews"
  ) {
    return "editor";
  }
  if (
    pathname.endsWith("/new") ||
    pathname === "/admin/shipping" ||
    /^\/admin\/(products|collections|bundles|orders|customers)\/[^/]+$/.test(pathname)
  ) {
    return "form";
  }
  return "table";
}

export function AdminPageSkeleton() {
  const pathname = usePathname();
  const kind = kindFor(pathname);

  return (
    <div aria-busy="true" aria-live="polite">
      <span className="sr-only">Loading</span>
      {kind === "dashboard" ? <DashboardSkeleton /> : null}
      {kind === "analytics" ? <AnalyticsSkeleton /> : null}
      {kind === "editor" ? <EditorSkeleton /> : null}
      {kind === "form" ? <FormSkeleton /> : null}
      {kind === "table" ? <TableSkeleton /> : null}
    </div>
  );
}
