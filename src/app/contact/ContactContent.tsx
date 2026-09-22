"use client";

import Link from "next/link";
import { Instagram, Mail } from "lucide-react";
import { useState, type FormEvent } from "react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { SITE_EMAIL, SITE_INSTAGRAM } from "@/lib/site";

export function ContactContent() {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [message, setMessage] = useState("");
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (event: FormEvent) => {
    event.preventDefault();
    setLoading(true);
    try {
      const res = await fetch("/api/contact", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name, email, phone, message }),
      });
      const payload = (await res.json().catch(() => ({}))) as { error?: string };
      if (!res.ok) {
        toast.error(payload.error || "Could not send your message. Please try again.");
        return;
      }
      toast.success("Message sent. We'll get back to you shortly.");
      setName("");
      setEmail("");
      setPhone("");
      setMessage("");
    } catch {
      toast.error("Could not send your message. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="mx-auto max-w-4xl px-5 py-16 sm:px-8 sm:py-24">
      <div className="text-center">
        <p className="eyebrow text-gold">Get in touch</p>
        <h1 className="mt-5 font-display text-[2.35rem] font-semibold tracking-tight sm:text-6xl">
          Contact
        </h1>
        <p className="mx-auto mt-6 max-w-xl text-sm leading-relaxed text-charcoal sm:text-base">
          Questions about sizing, orders, or delivery? Write to us — every message reaches{" "}
          {SITE_EMAIL}.
        </p>
      </div>

      <form
        onSubmit={handleSubmit}
        className="mx-auto mt-14 max-w-2xl space-y-6 rounded-3xl border border-gold/25 bg-cream p-7 text-left sm:p-10"
      >
        <div className="grid gap-6 sm:grid-cols-2">
          <div>
            <Label htmlFor="contact-name" className="text-[0.7rem] tracking-[0.16em] uppercase">
              Name
            </Label>
            <Input
              id="contact-name"
              required
              minLength={2}
              maxLength={100}
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="mt-2 h-12 rounded-full border-gold/20 bg-ivory px-5"
            />
          </div>
          <div>
            <Label htmlFor="contact-email" className="text-[0.7rem] tracking-[0.16em] uppercase">
              Email
            </Label>
            <Input
              id="contact-email"
              type="email"
              required
              maxLength={255}
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="mt-2 h-12 rounded-full border-gold/20 bg-ivory px-5"
            />
          </div>
        </div>
        <div>
          <Label htmlFor="contact-phone" className="text-[0.7rem] tracking-[0.16em] uppercase">
            Phone (optional)
          </Label>
          <Input
            id="contact-phone"
            type="tel"
            maxLength={20}
            value={phone}
            onChange={(e) => setPhone(e.target.value)}
            className="mt-2 h-12 rounded-full border-gold/20 bg-ivory px-5"
          />
        </div>
        <div>
          <Label htmlFor="contact-message" className="text-[0.7rem] tracking-[0.16em] uppercase">
            Message
          </Label>
          <Textarea
            id="contact-message"
            required
            minLength={10}
            maxLength={2000}
            rows={6}
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            className="mt-2 min-h-36 rounded-3xl border-gold/20 bg-ivory px-5 py-3"
          />
        </div>
        <Button
          type="submit"
          disabled={loading}
          className="h-12 w-full rounded-full bg-gold px-8 text-xs font-semibold tracking-[0.16em] text-foreground uppercase hover:bg-gold/90 sm:w-auto"
        >
          {loading ? "Sending…" : "Send message"}
        </Button>
      </form>

      <div className="mx-auto mt-10 grid max-w-2xl gap-4 sm:grid-cols-2">
        <a
          href={`mailto:${SITE_EMAIL}`}
          className="rounded-3xl border border-gold/20 bg-cream p-6 text-left transition-colors hover:border-gold sm:p-8"
        >
          <Mail className="size-5 text-gold" />
          <p className="mt-4 font-semibold">Email</p>
          <p className="mt-2 text-sm text-charcoal break-all">{SITE_EMAIL}</p>
        </a>
        <a
          href={SITE_INSTAGRAM}
          target="_blank"
          rel="noreferrer noopener"
          className="rounded-3xl border border-gold/20 bg-cream p-6 text-left transition-colors hover:border-gold sm:p-8"
        >
          <Instagram className="size-5 text-gold" />
          <p className="mt-4 font-semibold">Instagram</p>
          <p className="mt-2 text-sm text-charcoal">@abcollection.co.in</p>
        </a>
      </div>

      <div className="mx-auto mt-14 max-w-2xl rounded-3xl bg-cream px-5 py-12 text-center sm:px-8">
        <h2 className="font-display text-3xl font-semibold">Ready to shop?</h2>
        <p className="mx-auto mt-4 max-w-md text-sm leading-relaxed text-charcoal">
          Browse the collection, add pieces to your cart, and checkout when you&apos;re ready.
        </p>
        <Button
          asChild
          className="mt-7 h-12 w-full max-w-xs rounded-full bg-gold px-8 text-xs font-semibold tracking-[0.16em] text-foreground uppercase hover:bg-gold/90 sm:w-auto sm:max-w-none"
        >
          <Link href="/collection">Shop Collection</Link>
        </Button>
      </div>
    </div>
  );
}
