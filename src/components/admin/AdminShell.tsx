"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import type { ReactNode } from "react";

import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

const LINKS = [
  { href: "/admin", label: "Dashboard" },
  { href: "/admin/analytics", label: "Analytics" },
  { href: "/admin/products", label: "Products" },
  { href: "/admin/badges", label: "Badges" },
  { href: "/admin/coupons", label: "Coupons" },
  { href: "/admin/bundles", label: "Bundles" },
  { href: "/admin/shipping", label: "Shipping" },
  { href: "/admin/collections", label: "Collections" },
  { href: "/admin/orders", label: "Orders" },
  { href: "/admin/reviews", label: "Reviews" },
  { href: "/admin/customers", label: "Customers" },
];

export function AdminShell({ children, username }: { children: ReactNode; username: string }) {
  const pathname = usePathname();
  const router = useRouter();

  const logout = async () => {
    await fetch("/api/admin/auth", { method: "DELETE" });
    router.replace("/admin/login");
    router.refresh();
  };

  return (
    <div className="min-h-screen bg-[#f7f7f5] text-foreground">
      <header className="border-b border-border bg-white">
        <div className="mx-auto flex max-w-6xl items-center justify-between gap-4 px-5 py-4">
          <div>
            <p className="font-display text-2xl font-bold">AB Admin</p>
            <p className="text-xs text-muted-foreground">Signed in as {username}</p>
          </div>
          <div className="flex items-center gap-2">
            <Button asChild variant="outline" className="rounded-full">
              <Link href="/" target="_blank">
                View site
              </Link>
            </Button>
            <Button
              onClick={logout}
              className="rounded-full bg-ink text-ink-foreground hover:bg-ink/90"
            >
              Log out
            </Button>
          </div>
        </div>
        <nav className="mx-auto flex max-w-6xl gap-1 overflow-x-auto px-5 pb-3">
          {LINKS.map((link) => {
            const active =
              link.href === "/admin" ? pathname === "/admin" : pathname.startsWith(link.href);
            return (
              <Link
                key={link.href}
                href={link.href}
                className={cn(
                  "inline-flex h-9 items-center justify-center rounded-full px-4 text-sm font-medium leading-none transition-colors",
                  active
                    ? "bg-teal text-teal-foreground"
                    : "bg-muted text-foreground hover:bg-border",
                )}
              >
                {link.label}
              </Link>
            );
          })}
        </nav>
      </header>
      <div className="mx-auto max-w-6xl px-5 py-8">{children}</div>
    </div>
  );
}
