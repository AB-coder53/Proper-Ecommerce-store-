import { useEffect, useRef, useState } from "react";
import { Loader2 } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import type { EarlyAccessResult } from "@/lib/api-types";
import { isEarlyAccessUnlocked, saveEarlyAccess, trackEvent } from "@/lib/early-access";

const isValidEmail = (value: string) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value.trim());

type Props = {
  /** Re-opens the layer for a visitor who skipped it earlier. */
  forceOpen?: boolean;
  onClose?: () => void;
  onEmailCaptured?: (email: string) => void;
};

export function EarlyAccessOverlay({ forceOpen = false, onClose, onEmailCaptured }: Props) {
  const [visible, setVisible] = useState(false);
  const [entered, setEntered] = useState(false);
  const [leaving, setLeaving] = useState(false);
  const [email, setEmail] = useState("");
  const [touched, setTouched] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState(false);
  const inputRef = useRef<HTMLInputElement | null>(null);

  useEffect(() => {
    if (isEarlyAccessUnlocked()) return;
    setVisible(true);
    trackEvent("early_access_viewed");
    const id = window.requestAnimationFrame(() => setEntered(true));
    return () => window.cancelAnimationFrame(id);
  }, []);

  useEffect(() => {
    if (!forceOpen) return;
    setLeaving(false);
    setSuccess(false);
    setError("");
    setVisible(true);
    trackEvent("early_access_viewed");
    const id = window.requestAnimationFrame(() => setEntered(true));
    return () => window.cancelAnimationFrame(id);
  }, [forceOpen]);

  useEffect(() => {
    if (!visible) return;
    const previous = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = previous;
    };
  }, [visible]);

  const close = () => {
    setLeaving(true);
    window.setTimeout(() => {
      setVisible(false);
      setEntered(false);
      setLeaving(false);
      onClose?.();
    }, 400);
  };

  const handleSkip = () => {
    trackEvent("early_access_skipped");
    close();
  };

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    setTouched(true);
    if (loading) return;
    if (!isValidEmail(email)) {
      setError("Please enter a valid email address.");
      return;
    }
    setError("");
    setLoading(true);
    inputRef.current?.blur(); // dismiss the mobile keyboard before the reveal
    try {
      const response = await fetch("/api/early-access", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: email.trim().toLowerCase() }),
      });
      const payload = (await response.json()) as EarlyAccessResult | { error?: string };
      if (!response.ok || !("status" in payload)) {
        throw new Error(
          "error" in payload ? (payload.error ?? "Request failed") : "Request failed",
        );
      }
      saveEarlyAccess(payload.email);
      onEmailCaptured?.(payload.email);
      trackEvent(
        payload.status === "existing" ? "early_access_duplicate" : "early_access_submitted",
      );
      setSuccess(true);
      window.setTimeout(close, 1400);
    } catch {
      setError("We couldn't save your email right now. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  if (!visible) return null;

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label="AB Collection early access"
      className={`fixed inset-0 z-100 w-full overflow-x-hidden overflow-y-auto overscroll-contain bg-background transition-opacity duration-300 ${
        entered && !leaving ? "opacity-100" : "opacity-0"
      }`}
    >
      <div
        className="flex min-h-full w-full items-center justify-center px-5 py-10 sm:px-6"
        style={{
          paddingTop: "max(2.5rem, env(safe-area-inset-top))",
          paddingBottom: "max(2.5rem, env(safe-area-inset-bottom))",
        }}
      >
        <div
          className={`w-full max-w-md text-center transition-all duration-500 ease-out ${
            entered && !leaving ? "translate-y-0 opacity-100" : "translate-y-4 opacity-0"
          }`}
        >
          {success ? (
            <div aria-live="polite">
              <h1 className="font-display text-4xl leading-tight text-foreground">You're In.</h1>
              <p className="mt-4 text-sm text-muted-foreground">
                Welcome to AB Collection Early Access.
              </p>
            </div>
          ) : (
            <>
              <p className="eyebrow">AB Collection</p>
              <div className="mx-auto mt-6 h-px w-10 bg-border" />
              <h1 className="mt-5 font-display text-[2rem] leading-[1.15] text-foreground sm:text-5xl">
                The first collection is almost here.
              </h1>
              <p className="mt-4 text-[0.95rem] leading-relaxed text-muted-foreground">
                Premium everyday essentials, built for comfort. Join early access and secure your
                exclusive 10% launch discount.
              </p>

              <form onSubmit={handleSubmit} className="mt-7 text-left" noValidate>
                <Label htmlFor="early-access-email" className="eyebrow">
                  Email address
                </Label>
                <Input
                  ref={inputRef}
                  id="early-access-email"
                  name="email"
                  type="email"
                  inputMode="email"
                  autoComplete="email"
                  autoCapitalize="none"
                  spellCheck={false}
                  placeholder="Enter your email address"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  onBlur={() => setTouched(true)}
                  aria-invalid={touched && !!error}
                  aria-describedby="early-access-help"
                  className="mt-2 h-13 rounded-none border-input bg-transparent px-4 text-base"
                />
                <p
                  id="early-access-help"
                  className={`mt-3 text-xs ${error ? "text-destructive" : "text-muted-foreground"}`}
                  aria-live="polite"
                >
                  {error || "No spam. Only important launch updates."}
                </p>

                <Button
                  type="submit"
                  disabled={loading}
                  className="mt-6 h-13 w-full rounded-full text-xs tracking-luxe uppercase"
                >
                  {loading ? (
                    <>
                      <Loader2 className="size-4 animate-spin" />
                      Joining Early Access…
                    </>
                  ) : error ? (
                    "Try Again"
                  ) : (
                    "Get Early Access"
                  )}
                </Button>
              </form>

              <button
                type="button"
                onClick={handleSkip}
                className="mt-6 inline-flex min-h-11 items-center justify-center px-2 text-sm text-muted-foreground underline-offset-4 transition-colors hover:text-foreground hover:underline focus-visible:ring-2 focus-visible:ring-ring focus-visible:outline-none"
              >
                Explore the Collection →
              </button>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
