"use client";

import Link from "next/link";
import { Instagram, Loader2, Mail } from "lucide-react";
import { useState, type FormEvent } from "react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { FormAlert } from "@/components/site/FormAlert";
import { apiErrorMessage, readJsonBody } from "@/lib/form-request";
import { LEGAL_NAV_LINKS } from "@/lib/legal/content";
import { NAV_LINKS, SITE_EMAIL, SITE_INSTAGRAM } from "@/lib/site";

export function SiteFooter() {
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const handleSubmit = async (event: FormEvent) => {
    event.preventDefault();
    if (loading) return;
    setLoading(true);
    setError("");
    try {
      const res = await fetch("/api/early-access", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email }),
      });
      const payload = await readJsonBody<{ error?: string }>(res);
      if (!res.ok) {
        const nextError = apiErrorMessage(payload, "Could not subscribe. Please try again.");
        setError(nextError);
        toast.error(nextError);
        return;
      }
      toast.success("You're on the list.");
      setEmail("");
    } catch {
      const nextError = "Could not subscribe. Please try again.";
      setError(nextError);
      toast.error(nextError);
    } finally {
      setLoading(false);
    }
  };

  return (
    <footer className="border-t border-border bg-sand px-5 py-16 sm:px-8 sm:py-20">
      <div className="mx-auto max-w-4xl text-center">
        <p className="font-display text-[2rem] font-bold tracking-tight sm:text-5xl">
          AB Collection
        </p>
        <p className="mx-auto mt-4 max-w-md text-sm text-muted-foreground">
          Premium everyday essentials. Shop the collection or get launch updates by email.
        </p>

        <form
          onSubmit={handleSubmit}
          aria-busy={loading}
          className="mx-auto mt-8 flex max-w-lg flex-col gap-3 sm:flex-row"
        >
          <label htmlFor="footer-email" className="sr-only">
            Email address
          </label>
          <Input
            id="footer-email"
            type="email"
            required
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="Enter your email"
            className="h-12 flex-1 rounded-full border-border bg-background px-5"
          />
          <Button
            type="submit"
            disabled={loading}
            className="h-12 w-full rounded-full bg-teal px-8 text-xs font-semibold tracking-[0.12em] text-teal-foreground uppercase hover:bg-teal/90 sm:w-auto"
          >
            {loading ? (
              <>
                <Loader2 className="size-4 animate-spin" />
                Subscribing…
              </>
            ) : (
              "Subscribe"
            )}
          </Button>
        </form>
        <div className="mx-auto mt-3 max-w-lg">
          <FormAlert error={error} />
        </div>

        <nav
          className="mt-12 flex flex-wrap items-center justify-center gap-x-8 gap-y-3 text-sm text-muted-foreground"
          aria-label="Footer"
        >
          {NAV_LINKS.map((link) => (
            <Link
              key={link.href}
              href={link.href}
              className="transition-colors hover:text-foreground"
            >
              {link.label}
            </Link>
          ))}
          <Link href="/track-order" className="transition-colors hover:text-foreground">
            Track Your Order
          </Link>
          <Link href="/account" className="transition-colors hover:text-foreground">
            My Account
          </Link>
          <Link href="/wholesale" className="transition-colors hover:text-foreground">
            Wholesale
          </Link>
          <a
            href={`mailto:${SITE_EMAIL}`}
            className="inline-flex items-center gap-2 transition-colors hover:text-foreground"
          >
            <Mail className="size-3.5" /> Email
          </a>
          <a
            href={SITE_INSTAGRAM}
            target="_blank"
            rel="noreferrer noopener"
            className="inline-flex items-center gap-2 transition-colors hover:text-foreground"
          >
            <Instagram className="size-3.5" /> Instagram
          </a>
        </nav>

        <nav
          className="mt-6 flex flex-wrap items-center justify-center gap-x-5 gap-y-2 text-xs text-muted-foreground"
          aria-label="Legal"
        >
          {LEGAL_NAV_LINKS.map((link) => (
            <Link
              key={link.href}
              href={link.href}
              className="transition-colors hover:text-foreground"
            >
              {link.label}
            </Link>
          ))}
        </nav>

        <p className="mt-10 text-xs tracking-[0.12em] text-muted-foreground uppercase">
          © {new Date().getFullYear()} AB Collection · Made in India
        </p>
        <p className="mt-3 text-xs text-muted-foreground">
          Designed and developed by{" "}
          <a
            href="https://hussainiitservices.com"
            target="_blank"
            rel="noreferrer noopener"
            className="font-medium text-foreground underline-offset-4 transition-colors hover:text-teal hover:underline"
          >
            Hussainiitservices.com
          </a>
        </p>
      </div>
    </footer>
  );
}
