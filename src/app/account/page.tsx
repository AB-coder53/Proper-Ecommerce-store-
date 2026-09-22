"use client";

import Link from "next/link";
import { useEffect } from "react";
import { useRouter } from "next/navigation";
import { Heart, LogOut, MapPin, Package, Settings, User } from "lucide-react";

import { useCommerce } from "@/components/commerce/CommerceProvider";
import { Button } from "@/components/ui/button";

const LINKS = [
  { href: "/account/orders", label: "My Orders", icon: Package },
  { href: "/track-order", label: "Track Order", icon: MapPin },
  { href: "/account/wishlist", label: "Wishlist", icon: Heart },
  { href: "/account/settings", label: "Profile & addresses", icon: Settings },
];

export default function AccountPage() {
  const { customer, loading, openAuth, logout } = useCommerce();
  const router = useRouter();

  useEffect(() => {
    if (!loading && !customer) openAuth({ type: "generic", redirect: "/account" });
  }, [customer, loading, openAuth]);

  if (loading) return <div className="min-h-[40vh]" />;
  if (!customer) {
    return (
      <div className="mx-auto max-w-lg px-5 py-20 text-center">
        <h1 className="font-display text-3xl font-bold">My Account</h1>
        <p className="mt-3 text-sm text-muted-foreground">
          Sign in to view your profile and orders.
        </p>
        <Button
          onClick={() => openAuth({ type: "generic", redirect: "/account" })}
          className="mt-6 h-11 rounded-full bg-teal px-8 text-xs tracking-[0.12em] text-teal-foreground uppercase"
        >
          Login / Signup
        </Button>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-3xl px-5 py-12 sm:px-8 sm:py-16">
      <div className="flex items-start justify-between gap-4">
        <div>
          <p className="eyebrow">Account</p>
          <h1 className="mt-3 font-display text-[2.15rem] font-bold tracking-tight sm:text-5xl">
            {customer.fullName}
          </h1>
          <p className="mt-3 text-sm text-muted-foreground">{customer.email}</p>
          <p className="mt-1 text-sm text-muted-foreground">{customer.phone}</p>
        </div>
        <div className="flex size-12 items-center justify-center rounded-full bg-muted">
          <User className="size-5" />
        </div>
      </div>

      <div className="mt-10 grid gap-3">
        {LINKS.map((link) => (
          <Link
            key={link.href}
            href={link.href}
            className="flex items-center gap-3 rounded-2xl border border-border px-5 py-4 transition-colors hover:border-foreground"
          >
            <link.icon className="size-4 text-teal" />
            <span className="font-medium">{link.label}</span>
          </Link>
        ))}
        <button
          type="button"
          onClick={() => {
            void logout();
            router.push("/");
          }}
          className="flex items-center gap-3 rounded-2xl border border-border px-5 py-4 text-left transition-colors hover:border-foreground"
        >
          <LogOut className="size-4 text-teal" />
          <span className="font-medium">Logout</span>
        </button>
      </div>
    </div>
  );
}
