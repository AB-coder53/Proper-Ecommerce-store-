"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { ArrowLeft, Check, Loader2, X } from "lucide-react";

import { Dialog, DialogContent, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { Button } from "@/components/ui/button";
import type { Product } from "@/data/products";
import type { ReservationResult } from "@/lib/api-types";
import { makeReservationId } from "@/lib/reservation-utils";
import { readEarlyAccessEmail } from "@/lib/early-access";
import { useCatalog } from "@/components/site/CatalogProvider";

type Props = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  product: Product | null;
};

const STORAGE_KEY = "ab-reservation-draft";
const TOTAL_STEPS = 4;

type Variant = { size: string; color: string };

type Draft = {
  step: number;
  products: string[];
  variants: Record<string, Variant>;
  fullName: string;
  mobile: string;
  city: string;
  email: string;
};

const EMPTY: Draft = {
  step: 1,
  products: [],
  variants: {},
  fullName: "",
  mobile: "",
  city: "",
  email: "",
};

const isValidMobile = (value: string) => /^[6-9]\d{9}$/.test(value.trim());
const isValidEmail = (value: string) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value.trim());

export function RegisterDialog({ open, onOpenChange, product }: Props) {
  const { products: PRODUCTS } = useCatalog();
  const [draft, setDraft] = useState<Draft>(EMPTY);
  const [touched, setTouched] = useState<{ fullName?: boolean; mobile?: boolean; email?: boolean }>(
    {},
  );
  const [whatsappOptIn, setWhatsappOptIn] = useState(true);
  const [terms, setTerms] = useState(false);
  const [termsError, setTermsError] = useState(false);
  const [formError, setFormError] = useState("");
  const [loading, setLoading] = useState(false);
  const [done, setDone] = useState<{ reservationId: string } | null>(null);
  const [duplicate, setDuplicate] = useState<{ reservationId: string | null } | null>(null);
  const scrollRef = useRef<HTMLDivElement | null>(null);
  const hydrated = useRef(false);
  const pendingId = useRef<string | null>(null);

  const set = <K extends keyof Draft>(key: K, value: Draft[K]) =>
    setDraft((prev) => ({ ...prev, [key]: value }));

  // Restore any saved progress when the flow opens.
  useEffect(() => {
    if (!open) return;
    setDone(null);
    setDuplicate(null);
    setFormError("");
    setTermsError(false);
    setTouched({});

    let restored: Draft | null = null;
    try {
      const raw = window.localStorage.getItem(STORAGE_KEY);
      if (raw) restored = { ...EMPTY, ...(JSON.parse(raw) as Partial<Draft>) };
    } catch {
      restored = null;
    }

    const base = restored ?? EMPTY;
    const preselected =
      product && !base.products.includes(product.name)
        ? [...base.products, product.name]
        : base.products;

    // Prefill the email captured in the Early Access layer, if the visitor
    // hasn't already typed one into this form.
    const earlyAccessEmail = readEarlyAccessEmail();
    setDraft({
      ...base,
      products: preselected,
      email: base.email || earlyAccessEmail,
    });
    hydrated.current = true;
  }, [open, product]);

  // Persist progress so an accidental close never loses the answers.
  useEffect(() => {
    if (!open || !hydrated.current || done) return;
    try {
      window.localStorage.setItem(STORAGE_KEY, JSON.stringify(draft));
    } catch {
      /* storage unavailable — progress simply isn't persisted */
    }
  }, [draft, open, done]);

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: 0, behavior: "smooth" });
  }, [draft.step, done, duplicate]);

  const selectedProducts = useMemo(
    () => PRODUCTS.filter((p) => draft.products.includes(p.name)),
    [draft.products],
  );

  // Drop variant state for deselected products and clear values that are not
  // available for the product they belong to.
  useEffect(() => {
    setDraft((prev) => {
      const next: Record<string, Variant> = {};
      let changed = false;
      for (const p of PRODUCTS) {
        if (!prev.products.includes(p.name)) {
          if (prev.variants[p.name]) changed = true;
          continue;
        }
        const current = prev.variants[p.name] ?? { size: "", color: "" };
        const cleaned: Variant = {
          size: p.sizes.includes(current.size) ? current.size : "",
          color: p.colors.includes(current.color) ? current.color : "",
        };
        if (cleaned.size !== current.size || cleaned.color !== current.color) changed = true;
        if (!prev.variants[p.name]) changed = true;
        next[p.name] = cleaned;
      }
      return changed ? { ...prev, variants: next } : prev;
    });
  }, [draft.products]);

  const setVariant = (name: string, key: keyof Variant, value: string) =>
    setDraft((prev) => ({
      ...prev,
      variants: {
        ...prev.variants,
        [name]: { size: "", color: "", ...prev.variants[name], [key]: value },
      },
    }));

  const variantsComplete =
    selectedProducts.length > 0 &&
    selectedProducts.every((p) => {
      const v = draft.variants[p.name];
      return !!v && p.sizes.includes(v.size) && p.colors.includes(v.color);
    });

  const nameValid = draft.fullName.trim().length >= 2;
  const mobileValid = isValidMobile(draft.mobile);
  const emailValid = !draft.email.trim() || isValidEmail(draft.email);

  const goTo = (step: number) => set("step", Math.min(TOTAL_STEPS, Math.max(1, step)));

  async function handleReserve() {
    if (!terms) {
      setTermsError(true);
      return;
    }
    if (loading) return;
    setLoading(true);
    setFormError("");
    try {
      const items = selectedProducts.map((p) => ({
        productName: p.name,
        size: draft.variants[p.name]?.size ?? "",
        colour: draft.variants[p.name]?.color ?? "",
      }));
      // Reuse the same id across retries so a partial write is never duplicated.
      pendingId.current ??= makeReservationId();
      const response = await fetch("/api/reservations", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          reservationId: pendingId.current,
          fullName: draft.fullName.trim(),
          mobile: draft.mobile.trim(),
          email: draft.email.trim(),
          city: draft.city.trim(),
          whatsappOptIn,
          termsAccepted: true as const,
          items,
        }),
      });
      const payload = (await response.json()) as ReservationResult | { error?: string };
      if (!response.ok || !("status" in payload)) {
        throw new Error(
          "status" in payload ? "Reservation failed" : (payload.error ?? "Reservation failed"),
        );
      }
      try {
        window.localStorage.removeItem(STORAGE_KEY);
      } catch {
        /* ignore */
      }
      if (payload.status === "duplicate") {
        setDuplicate({ reservationId: payload.reservationId });
      } else {
        setDone({ reservationId: payload.reservationId });
      }
    } catch {
      setFormError(
        "We couldn't complete your reservation right now. Please try again in a moment.",
      );
    } finally {
      setLoading(false);
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="flex h-[100dvh] max-h-[100dvh] w-screen max-w-none translate-x-0 translate-y-0 flex-col gap-0 rounded-none border-0 bg-background p-0 top-0 left-0 sm:top-1/2 sm:left-1/2 sm:h-auto sm:max-h-[92vh] sm:w-full sm:max-w-lg sm:-translate-x-1/2 sm:-translate-y-1/2 sm:border sm:border-border [&>button:last-child]:hidden">
        {duplicate ? (
          <AlreadyReservedScreen
            reservationId={duplicate.reservationId}
            onClose={() => onOpenChange(false)}
          />
        ) : done ? (
          <SuccessScreen
            firstName={draft.fullName.trim().split(" ")[0] ?? ""}
            code={done.reservationId}
            onClose={() => onOpenChange(false)}
          />
        ) : (
          <>
            <header className="shrink-0 border-b border-border bg-background/95 px-5 pt-4 pb-3 backdrop-blur">
              <div className="flex items-center justify-between">
                {draft.step > 1 ? (
                  <button
                    type="button"
                    onClick={() => goTo(draft.step - 1)}
                    aria-label="Go back"
                    className="-ml-2 flex size-10 items-center justify-center text-muted-foreground transition-colors hover:text-foreground"
                  >
                    <ArrowLeft className="size-5" strokeWidth={1.5} />
                  </button>
                ) : (
                  <span className="size-10" />
                )}
                <p className="text-[0.6rem] tracking-[0.22em] text-muted-foreground uppercase">
                  Step {draft.step} of {TOTAL_STEPS}
                </p>
                <button
                  type="button"
                  onClick={() => onOpenChange(false)}
                  aria-label="Close"
                  className="-mr-2 flex size-10 items-center justify-center text-muted-foreground transition-colors hover:text-foreground"
                >
                  <X className="size-5" strokeWidth={1.5} />
                </button>
              </div>
              <div className="mt-3 flex gap-1.5" aria-hidden>
                {Array.from({ length: TOTAL_STEPS }).map((_, i) => (
                  <span
                    key={i}
                    className={`h-0.5 flex-1 transition-colors duration-300 ${
                      i < draft.step ? "bg-foreground" : "bg-border"
                    }`}
                  />
                ))}
              </div>
            </header>

            <div ref={scrollRef} className="min-h-0 flex-1 overflow-y-auto px-5 pt-8 pb-6">
              {draft.step === 1 ? (
                <StepShell
                  title="Choose Your Favourite"
                  subtitle="Reserve the products you're most interested in."
                >
                  <div className="mt-7 space-y-3">
                    {PRODUCTS.map((p) => {
                      const active = draft.products.includes(p.name);
                      return (
                        <button
                          type="button"
                          key={p.id}
                          aria-pressed={active}
                          onClick={() =>
                            set(
                              "products",
                              active
                                ? draft.products.filter((n) => n !== p.name)
                                : [...draft.products, p.name],
                            )
                          }
                          className={`flex w-full items-center gap-4 border p-3 text-left transition-colors duration-200 ${
                            active
                              ? "border-foreground bg-muted/60"
                              : "border-border hover:border-foreground"
                          }`}
                        >
                          <img
                            src={p.image}
                            alt={p.name}
                            loading="lazy"
                            width={160}
                            height={200}
                            className="size-20 shrink-0 bg-muted object-cover object-top"
                          />
                          <span className="min-w-0 flex-1">
                            <span className="flex items-start justify-between gap-3">
                              <span className="text-base leading-snug">{p.name}</span>
                              <span className="shrink-0 text-xs text-muted-foreground">
                                {p.price}
                              </span>
                            </span>
                            <span className="mt-1.5 flex flex-wrap gap-1.5">
                              {highlights(p).map((h) => (
                                <span
                                  key={h}
                                  className="border border-border px-2 py-0.5 text-[0.6rem] tracking-[0.12em] text-muted-foreground uppercase"
                                >
                                  {h}
                                </span>
                              ))}
                            </span>
                          </span>
                          <span
                            className={`flex size-6 shrink-0 items-center justify-center border transition-colors duration-200 ${
                              active
                                ? "border-foreground bg-foreground text-background"
                                : "border-border"
                            }`}
                          >
                            {active ? <Check className="size-3.5" strokeWidth={2} /> : null}
                          </span>
                        </button>
                      );
                    })}
                  </div>
                </StepShell>
              ) : null}

              {draft.step === 2 ? (
                <StepShell
                  title="Pick Your Size & Colour"
                  subtitle="Choose a preference for each product you reserved."
                >
                  <div className="mt-8 space-y-10">
                    {selectedProducts.map((p) => {
                      const v = draft.variants[p.name] ?? { size: "", color: "" };
                      return (
                        <section key={p.id}>
                          <div className="flex items-start justify-between gap-3 border-b border-border pb-3">
                            <h3 className="font-display text-xl leading-snug">{p.name}</h3>
                            <span className="mt-1 shrink-0 text-[0.6rem] tracking-[0.14em] text-muted-foreground uppercase">
                              {p.fabric}
                            </span>
                          </div>

                          <fieldset className="mt-5">
                            <legend className="eyebrow">Preferred size</legend>
                            <div className="mt-3 grid grid-cols-3 gap-2 sm:grid-cols-5">
                              {p.sizes.map((s) => (
                                <button
                                  type="button"
                                  key={s}
                                  aria-pressed={s === v.size}
                                  onClick={() => setVariant(p.name, "size", s)}
                                  className={`h-12 border text-sm transition-colors duration-200 ${
                                    s === v.size
                                      ? "border-foreground bg-foreground text-background"
                                      : "border-border hover:border-foreground"
                                  }`}
                                >
                                  {s}
                                </button>
                              ))}
                            </div>
                          </fieldset>

                          <fieldset className="mt-6">
                            <legend className="eyebrow">Preferred colour</legend>
                            <div className="mt-3 grid grid-cols-2 gap-2">
                              {p.colors.map((c) => (
                                <button
                                  type="button"
                                  key={c}
                                  aria-pressed={c === v.color}
                                  onClick={() => setVariant(p.name, "color", c)}
                                  className={`h-12 border px-2 text-sm transition-colors duration-200 ${
                                    c === v.color
                                      ? "border-foreground bg-foreground text-background"
                                      : "border-border hover:border-foreground"
                                  }`}
                                >
                                  {c}
                                </button>
                              ))}
                            </div>
                          </fieldset>
                        </section>
                      );
                    })}
                  </div>
                </StepShell>
              ) : null}

              {draft.step === 3 ? (
                <StepShell
                  title="Reserve Your Launch Access"
                  subtitle="Just your name and number. Takes less than 30 seconds."
                >
                  <div className="mt-8 space-y-7">
                    <div>
                      <Label htmlFor="fullName" className="eyebrow">
                        Full name
                      </Label>
                      <Input
                        id="fullName"
                        name="name"
                        autoComplete="name"
                        enterKeyHint="next"
                        maxLength={100}
                        value={draft.fullName}
                        onChange={(e) => set("fullName", e.target.value)}
                        onBlur={() => setTouched((t) => ({ ...t, fullName: true }))}
                        placeholder="Your name"
                        className="mt-2 h-13 rounded-none border-0 border-b border-input bg-transparent px-0 text-base shadow-none focus-visible:border-foreground focus-visible:ring-0"
                      />
                      <p className="mt-2 min-h-4 text-xs text-destructive">
                        {touched.fullName && !nameValid ? "Please enter your full name." : ""}
                      </p>
                    </div>

                    <div>
                      <Label htmlFor="mobile" className="eyebrow">
                        Mobile number
                      </Label>
                      <Input
                        id="mobile"
                        name="tel"
                        type="tel"
                        inputMode="numeric"
                        autoComplete="tel-national"
                        enterKeyHint="done"
                        value={draft.mobile}
                        onChange={(e) =>
                          set("mobile", e.target.value.replace(/\D/g, "").slice(0, 10))
                        }
                        onBlur={() => setTouched((t) => ({ ...t, mobile: true }))}
                        placeholder="10-digit mobile number"
                        className="mt-2 h-13 rounded-none border-0 border-b border-input bg-transparent px-0 text-base shadow-none focus-visible:border-foreground focus-visible:ring-0"
                      />
                      <p className="mt-2 min-h-4 text-xs text-destructive">
                        {touched.mobile && !mobileValid
                          ? "Enter a valid 10-digit Indian mobile number."
                          : ""}
                      </p>
                    </div>
                  </div>

                  <p className="mt-9 eyebrow">
                    Optional{" "}
                    <span className="normal-case opacity-60">— helps us plan delivery</span>
                  </p>

                  <div className="mt-8">
                    <Label htmlFor="city" className="eyebrow">
                      City
                    </Label>
                    <Input
                      id="city"
                      name="city"
                      autoComplete="address-level2"
                      maxLength={80}
                      value={draft.city}
                      onChange={(e) => set("city", e.target.value)}
                      placeholder="Your city"
                      className="mt-2 h-13 rounded-none border-0 border-b border-input bg-transparent px-0 text-base shadow-none focus-visible:border-foreground focus-visible:ring-0"
                    />
                  </div>

                  <div className="mt-7">
                    <Label htmlFor="email" className="eyebrow">
                      Email
                    </Label>
                    <Input
                      id="email"
                      name="email"
                      type="email"
                      inputMode="email"
                      autoComplete="email"
                      maxLength={255}
                      value={draft.email}
                      onChange={(e) => set("email", e.target.value)}
                      onBlur={() => setTouched((t) => ({ ...t, email: true }))}
                      placeholder="you@email.com"
                      className="mt-2 h-13 rounded-none border-0 border-b border-input bg-transparent px-0 text-base shadow-none focus-visible:border-foreground focus-visible:ring-0"
                    />
                    <p
                      className={`mt-2 min-h-4 text-xs ${
                        touched.email && !emailValid ? "text-destructive" : "text-muted-foreground"
                      }`}
                    >
                      {touched.email && !emailValid
                        ? "Enter a valid email address."
                        : "We'll email your launch code as a backup."}
                    </p>
                  </div>
                </StepShell>
              ) : null}

              {draft.step === 4 ? (
                <StepShell
                  title="Confirm Your Reservation"
                  subtitle="One tap and your launch access is locked in."
                >
                  <div className="mt-7 border border-border bg-muted/50 p-5">
                    {selectedProducts.map((p) => (
                      <SummaryRow
                        key={p.id}
                        label={p.name}
                        value={`${draft.variants[p.name]?.size ?? "—"} · ${
                          draft.variants[p.name]?.color ?? "—"
                        }`}
                      />
                    ))}
                    <SummaryRow label="Full name" value={draft.fullName.trim() || "—"} />
                    <SummaryRow label="Mobile number" value={draft.mobile || "—"} />
                    {draft.city.trim() ? (
                      <SummaryRow label="City" value={draft.city.trim()} />
                    ) : null}
                  </div>

                  <button
                    type="button"
                    onClick={() => goTo(2)}
                    className="mt-3 text-[0.65rem] tracking-[0.18em] text-muted-foreground uppercase underline underline-offset-4 transition-colors hover:text-foreground"
                  >
                    Edit selection
                  </button>

                  <ul className="mt-7 space-y-3">
                    {[
                      "10% Launch Discount Reserved",
                      "Early Access Before Public Launch",
                      "No Payment Today",
                      "Priority Launch Notification",
                    ].map((benefit) => (
                      <li key={benefit} className="flex items-center gap-3 text-sm">
                        <Check className="size-4 shrink-0 text-olive" strokeWidth={2} />
                        {benefit}
                      </li>
                    ))}
                  </ul>

                  <div className="mt-8 space-y-4 border-t border-border pt-6">
                    <label
                      htmlFor="whatsapp"
                      className="flex cursor-pointer items-start gap-3 text-sm"
                    >
                      <Checkbox
                        id="whatsapp"
                        checked={whatsappOptIn}
                        onCheckedChange={(v) => setWhatsappOptIn(v === true)}
                        className="mt-0.5 rounded-none"
                      />
                      <span className="leading-relaxed text-muted-foreground">
                        Send me launch updates on WhatsApp
                      </span>
                    </label>
                    <div>
                      <label
                        htmlFor="terms"
                        className="flex cursor-pointer items-start gap-3 text-sm"
                      >
                        <Checkbox
                          id="terms"
                          checked={terms}
                          onCheckedChange={(v) => {
                            setTerms(v === true);
                            if (v === true) setTermsError(false);
                          }}
                          className="mt-0.5 rounded-none"
                        />
                        <span className="leading-relaxed text-muted-foreground">
                          I agree to the Terms &amp; Privacy Policy
                        </span>
                      </label>
                      {termsError ? (
                        <p className="mt-1 ml-7 text-xs text-destructive">
                          Please accept the terms to continue.
                        </p>
                      ) : null}
                    </div>
                  </div>

                  {formError ? <p className="mt-4 text-sm text-destructive">{formError}</p> : null}
                </StepShell>
              ) : null}
            </div>

            <footer className="shrink-0 border-t border-border bg-background px-5 pt-4 pb-[max(1rem,env(safe-area-inset-bottom))]">
              {draft.step === 1 ? (
                <Button
                  onClick={() => goTo(2)}
                  disabled={draft.products.length === 0}
                  className="h-14 w-full rounded-none text-xs tracking-[0.2em] uppercase"
                >
                  Continue
                </Button>
              ) : null}
              {draft.step === 2 ? (
                <Button
                  onClick={() => goTo(3)}
                  disabled={!variantsComplete}
                  className="h-14 w-full rounded-none text-xs tracking-[0.2em] uppercase"
                >
                  {variantsComplete ? "Continue" : "Select size & colour"}
                </Button>
              ) : null}
              {draft.step === 3 ? (
                <Button
                  onClick={() => goTo(4)}
                  disabled={!nameValid || !mobileValid || !emailValid}
                  className="h-14 w-full rounded-none text-xs tracking-[0.2em] uppercase"
                >
                  Continue
                </Button>
              ) : null}
              {draft.step === 4 ? (
                <Button
                  onClick={handleReserve}
                  disabled={loading}
                  className="h-14 w-full rounded-none text-xs tracking-[0.2em] uppercase"
                >
                  {loading ? (
                    <>
                      <Loader2 className="mr-2 size-4 animate-spin" /> Reserving your launch
                      access...
                    </>
                  ) : formError ? (
                    "Try Again"
                  ) : (
                    "Reserve My Launch Access"
                  )}
                </Button>
              ) : null}
              <p className="mt-3 text-center text-[0.65rem] tracking-[0.12em] text-muted-foreground uppercase">
                No payment today
              </p>
            </footer>
          </>
        )}
      </DialogContent>
    </Dialog>
  );
}

function highlights(product: Product) {
  const [weight] = product.fabric.split(" ");
  const fit = product.name.toLowerCase().includes("regular") ? "Regular Fit" : "Oversized Fit";
  const material = product.fabric.toLowerCase().includes("terry")
    ? "French Terry"
    : "Premium Cotton";
  return [weight?.includes("GSM") ? product.fabric.slice(0, 7) : weight, fit, material].filter(
    Boolean,
  ) as string[];
}

function StepShell({
  title,
  subtitle,
  children,
}: {
  title: string;
  subtitle: string;
  children: React.ReactNode;
}) {
  return (
    <div className="animate-fade-in">
      <DialogTitle asChild>
        <h2 className="font-display text-3xl leading-tight">{title}</h2>
      </DialogTitle>
      <DialogDescription asChild>
        <p className="mt-3 text-sm leading-relaxed text-muted-foreground">{subtitle}</p>
      </DialogDescription>
      {children}
    </div>
  );
}

function SummaryRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-start justify-between gap-6 border-b border-border py-3 last:border-b-0 last:pb-0 first:pt-0">
      <span className="shrink-0 text-[0.6rem] tracking-[0.18em] text-muted-foreground uppercase">
        {label}
      </span>
      <span className="text-right text-sm leading-snug">{value}</span>
    </div>
  );
}

function SuccessScreen({
  firstName,
  code,
  onClose,
}: {
  firstName: string;
  code: string;
  onClose: () => void;
}) {
  return (
    <div className="flex h-full flex-col overflow-y-auto px-6 py-12 text-center">
      <div className="flex flex-1 flex-col items-center justify-center">
        <div className="animate-scale-in mx-auto flex size-16 items-center justify-center rounded-full bg-olive text-olive-foreground">
          <Check className="size-7" strokeWidth={1.5} />
        </div>
        <DialogTitle asChild>
          <h2 className="animate-fade-in mt-8 font-display text-3xl leading-tight sm:text-5xl">
            You're In.
          </h2>
        </DialogTitle>
        <DialogDescription asChild>
          <p className="animate-fade-in mx-auto mt-5 max-w-sm text-sm leading-relaxed text-muted-foreground">
            {firstName ? `${firstName}, your` : "Your"} launch access has been successfully
            reserved. Your exclusive 10% launch discount is secured. We'll notify you before
            everyone else when AB Collection launches.
          </p>
        </DialogDescription>

        <div className="animate-fade-in mx-auto mt-8 w-full max-w-xs border border-border bg-muted/60 p-5">
          <p className="eyebrow">Reservation ID</p>
          <p className="mt-2 font-display text-3xl tracking-wide">{code}</p>
          <p className="mt-3 text-xs text-muted-foreground">Save this ID for your records.</p>
        </div>
      </div>

      <div className="mt-10 flex flex-col gap-3">
        <Button asChild className="h-14 w-full rounded-none text-xs tracking-[0.2em] uppercase">
          <a
            href="https://instagram.com/abcollection.co.in"
            target="_blank"
            rel="noreferrer noopener"
          >
            Follow AB Collection
          </a>
        </Button>
        <Button
          variant="outline"
          onClick={onClose}
          className="h-14 w-full rounded-none border-foreground text-xs tracking-[0.2em] uppercase"
        >
          Return to Website
        </Button>
      </div>
    </div>
  );
}

function AlreadyReservedScreen({
  reservationId,
  onClose,
}: {
  reservationId: string | null;
  onClose: () => void;
}) {
  return (
    <div className="flex h-full flex-col overflow-y-auto px-6 py-12 text-center">
      <div className="flex flex-1 flex-col items-center justify-center">
        <div className="animate-scale-in mx-auto flex size-16 items-center justify-center rounded-full bg-olive text-olive-foreground">
          <Check className="size-7" strokeWidth={1.5} />
        </div>
        <DialogTitle asChild>
          <h2 className="animate-fade-in mt-8 font-display text-3xl leading-tight sm:text-5xl">
            You're already on the list.
          </h2>
        </DialogTitle>
        <DialogDescription asChild>
          <p className="animate-fade-in mx-auto mt-5 max-w-sm text-sm leading-relaxed text-muted-foreground">
            Your AB Collection launch access is already reserved.
          </p>
        </DialogDescription>

        {reservationId ? (
          <div className="animate-fade-in mx-auto mt-8 w-full max-w-xs border border-border bg-muted/60 p-5">
            <p className="eyebrow">Reservation ID</p>
            <p className="mt-2 font-display text-3xl tracking-wide">{reservationId}</p>
          </div>
        ) : null}
      </div>

      <div className="mt-10 flex flex-col gap-3">
        <Button
          variant="outline"
          onClick={onClose}
          className="h-14 w-full rounded-none border-foreground text-xs tracking-[0.2em] uppercase"
        >
          Return to Website
        </Button>
      </div>
    </div>
  );
}
