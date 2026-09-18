"use client";

import Link from "next/link";
import { Instagram, Mail } from "lucide-react";

import { Button } from "@/components/ui/button";
import { SITE_EMAIL, SITE_INSTAGRAM } from "@/lib/site";

export function ContactContent() {
  return (
    <div className="mx-auto max-w-4xl px-5 py-14 text-center sm:px-8 sm:py-20">
      <p className="eyebrow">Get in touch</p>
      <h1 className="mt-4 font-display text-[2.15rem] font-bold tracking-tight sm:text-6xl">
        Contact
      </h1>
      <p className="mx-auto mt-6 max-w-xl text-sm leading-relaxed text-muted-foreground sm:text-base">
        Questions about sizing, orders, or delivery? We&apos;d love to hear from you.
      </p>

      <div className="mx-auto mt-12 grid max-w-2xl gap-4 sm:grid-cols-2">
        <a
          href={`mailto:${SITE_EMAIL}`}
          className="rounded-3xl border border-border bg-background p-6 text-left transition-colors hover:border-foreground sm:p-8"
        >
          <Mail className="size-5 text-teal" />
          <p className="mt-4 font-semibold">Email</p>
          <p className="mt-2 text-sm text-muted-foreground break-all">{SITE_EMAIL}</p>
        </a>
        <a
          href={SITE_INSTAGRAM}
          target="_blank"
          rel="noreferrer noopener"
          className="rounded-3xl border border-border bg-background p-6 text-left transition-colors hover:border-foreground sm:p-8"
        >
          <Instagram className="size-5 text-teal" />
          <p className="mt-4 font-semibold">Instagram</p>
          <p className="mt-2 text-sm text-muted-foreground">@abcollection.co.in</p>
        </a>
      </div>

      <div className="mt-12 rounded-3xl bg-sand px-5 py-10 sm:px-6">
        <h2 className="font-display text-2xl font-bold">Ready to shop?</h2>
        <p className="mx-auto mt-3 max-w-md text-sm text-muted-foreground">
          Browse the collection, add pieces to your cart, and checkout when you&apos;re ready.
        </p>
        <Button
          asChild
          className="mt-6 h-12 w-full max-w-xs rounded-full bg-teal px-8 text-xs font-semibold tracking-[0.12em] text-teal-foreground uppercase sm:w-auto sm:max-w-none"
        >
          <Link href="/collection">Shop Collection</Link>
        </Button>
      </div>
    </div>
  );
}
