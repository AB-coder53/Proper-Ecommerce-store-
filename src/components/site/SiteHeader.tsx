"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Heart, Menu, ShoppingBag, User, X } from "lucide-react";
import { useState } from "react";

import { useCommerce } from "@/components/commerce/CommerceProvider";
import { Button } from "@/components/ui/button";
import { NAV_LINKS } from "@/lib/site";
import { cn } from "@/lib/utils";

export function SiteHeader() {
  const pathname = usePathname();
  const { customer, cartCount, openAuth, wishlist, openCart } = useCommerce();
  const [mobileOpen, setMobileOpen] = useState(false);

  return (
    <header className="sticky top-0 z-40 border-b border-border/60 bg-background/90 backdrop-blur-md">
      <div className="mx-auto grid h-16 min-w-0 max-w-7xl grid-cols-[minmax(0,1fr)_auto] items-center gap-3 px-4 sm:h-20 sm:gap-4 sm:px-8 md:grid-cols-[minmax(0,1fr)_auto_minmax(0,1fr)]">
        <Link
          href="/"
          className="truncate font-display text-xl font-bold tracking-tight sm:text-[1.7rem]"
          aria-label="AB Collection home"
        >
          AB Collection
        </Link>

        <nav
          className="hidden items-center rounded-full bg-muted px-2 py-1.5 md:flex"
          aria-label="Primary"
        >
          {NAV_LINKS.map((link) => {
            const active =
              link.href === "/"
                ? pathname === "/"
                : pathname === link.href || pathname.startsWith(`${link.href}/`);
            return (
              <Link
                key={link.href}
                href={link.href}
                className={cn(
                  "rounded-full px-4 py-2 text-sm font-medium transition-colors",
                  active
                    ? "bg-background text-foreground shadow-sm"
                    : "text-foreground/75 hover:bg-background hover:text-foreground",
                )}
              >
                {link.label}
              </Link>
            );
          })}
        </nav>

        <div className="flex items-center justify-end gap-1.5 sm:gap-2">
          <Link
            href={customer ? "/account/wishlist" : "#"}
            aria-label="Wishlist"
            onClick={(e) => {
              if (!customer) {
                e.preventDefault();
                openAuth({ type: "generic", redirect: "/account/wishlist" });
              }
            }}
            className="relative hidden size-11 items-center justify-center rounded-full text-foreground/70 transition-colors hover:bg-muted hover:text-foreground md:inline-flex"
          >
            <Heart className="size-4" strokeWidth={1.75} />
            {wishlist.length > 0 ? (
              <span className="absolute top-1.5 right-1.5 size-1.5 rounded-full bg-teal" />
            ) : null}
          </Link>
          <button
            type="button"
            aria-label={cartCount ? `Open cart, ${cartCount} items` : "Open cart"}
            onClick={openCart}
            className="relative inline-flex size-11 items-center justify-center rounded-full text-foreground/70 transition-colors hover:bg-muted hover:text-foreground"
          >
            <ShoppingBag className="size-4" strokeWidth={1.75} />
            {cartCount > 0 ? (
              <span className="absolute -top-0.5 -right-0.5 inline-flex min-w-4 items-center justify-center rounded-full bg-teal px-1 text-[0.6rem] font-bold text-teal-foreground">
                {cartCount}
              </span>
            ) : null}
          </button>
          {customer ? (
            <Link
              href="/account"
              aria-label="Account"
              className="hidden size-11 items-center justify-center rounded-full text-foreground/70 transition-colors hover:bg-muted hover:text-foreground md:inline-flex"
            >
              <User className="size-4" strokeWidth={1.75} />
            </Link>
          ) : (
            <button
              type="button"
              aria-label="Account"
              onClick={() => openAuth({ type: "generic", redirect: "/account" })}
              className="hidden size-11 items-center justify-center rounded-full text-foreground/70 transition-colors hover:bg-muted hover:text-foreground md:inline-flex"
            >
              <User className="size-4" strokeWidth={1.75} />
            </button>
          )}
          <Button
            asChild
            className="hidden h-11 rounded-full bg-teal px-5 text-xs font-semibold tracking-[0.08em] text-teal-foreground uppercase hover:bg-teal/90 md:inline-flex"
          >
            <Link href="/collection">Shop Collection</Link>
          </Button>
          <button
            type="button"
            className="inline-flex size-11 items-center justify-center rounded-full hover:bg-muted md:hidden"
            aria-label={mobileOpen ? "Close menu" : "Open menu"}
            aria-expanded={mobileOpen}
            onClick={() => setMobileOpen((v) => !v)}
          >
            {mobileOpen ? <X className="size-5" /> : <Menu className="size-5" />}
          </button>
        </div>
      </div>

      {mobileOpen ? (
        <div className="border-t border-border bg-background px-5 py-4 md:hidden">
          <nav className="flex flex-col gap-1" aria-label="Mobile">
            {NAV_LINKS.map((link) => {
              const active =
                link.href === "/"
                  ? pathname === "/"
                  : pathname === link.href || pathname.startsWith(`${link.href}/`);
              return (
                <Link
                  key={link.href}
                  href={link.href}
                  onClick={() => setMobileOpen(false)}
                  className={cn(
                    "rounded-full px-4 py-3 text-sm font-medium transition-colors",
                    active
                      ? "bg-muted text-foreground shadow-sm"
                      : "text-foreground/80 hover:bg-muted hover:text-foreground",
                  )}
                >
                  {link.label}
                </Link>
              );
            })}
            <button
              type="button"
              onClick={() => {
                setMobileOpen(false);
                openCart();
              }}
              className="rounded-full px-4 py-3 text-left text-sm font-medium text-foreground/80 hover:bg-muted"
            >
              Cart ({cartCount})
            </button>
            <Link
              href={customer ? "/account" : "#"}
              onClick={(e) => {
                setMobileOpen(false);
                if (!customer) {
                  e.preventDefault();
                  openAuth({ type: "generic" });
                }
              }}
              className="rounded-full px-4 py-3 text-sm font-medium text-foreground/80 hover:bg-muted"
            >
              {customer ? "My Account" : "Login / Signup"}
            </Link>
            {customer ? (
              <Link
                href="/account/orders"
                onClick={() => setMobileOpen(false)}
                className="rounded-full px-4 py-3 text-sm font-medium text-foreground/80 hover:bg-muted"
              >
                My Orders
              </Link>
            ) : null}
            <Link
              href="/track-order"
              onClick={() => setMobileOpen(false)}
              className="rounded-full px-4 py-3 text-sm font-medium text-foreground/80 hover:bg-muted"
            >
              Track Your Order
            </Link>
            <Button
              asChild
              className="mt-2 h-11 rounded-full bg-teal text-xs font-semibold tracking-[0.1em] text-teal-foreground uppercase"
            >
              <Link href="/collection" onClick={() => setMobileOpen(false)}>
                Shop Collection
              </Link>
            </Button>
          </nav>
        </div>
      ) : null}
    </header>
  );
}
