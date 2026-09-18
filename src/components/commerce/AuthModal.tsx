"use client";

import { useState, type FormEvent } from "react";
import { Loader2 } from "lucide-react";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import type { CartItemInput, CustomerPublic } from "@/lib/commerce-types";

export function AuthModal({
  open,
  onOpenChange,
  onSuccess,
  guestCart,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess: (customer: CustomerPublic) => void | Promise<void>;
  guestCart: CartItemInput[];
}) {
  const [mode, setMode] = useState<"login" | "signup">("signup");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [password, setPassword] = useState("");

  const submit = async (event: FormEvent) => {
    event.preventDefault();
    setLoading(true);
    setError("");
    try {
      const res = await fetch("/api/customer/auth", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          mode,
          fullName,
          email,
          phone,
          password,
          guestCart,
        }),
      });
      const data = (await res.json()) as { customer?: CustomerPublic; error?: string };
      if (!res.ok || !data.customer) {
        setError(data.error || "Authentication failed.");
        return;
      }
      await onSuccess(data.customer);
      setPassword("");
    } catch {
      setError("Something went wrong. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md rounded-3xl border-border p-0 sm:max-w-md">
        <div className="px-6 pt-6 pb-2">
          <DialogHeader>
            <DialogTitle className="font-display text-3xl">
              {mode === "signup" ? "Create account" : "Welcome back"}
            </DialogTitle>
            <DialogDescription>
              {mode === "signup"
                ? "Sign up to checkout, track orders, and save your wishlist."
                : "Log in to continue to checkout and your account."}
            </DialogDescription>
          </DialogHeader>
        </div>

        <form onSubmit={submit} className="space-y-4 px-6 pb-6">
          {mode === "signup" ? (
            <>
              <div>
                <Label htmlFor="auth-name">Full name</Label>
                <Input
                  id="auth-name"
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  required
                  className="mt-1.5 h-11 rounded-full"
                />
              </div>
              <div>
                <Label htmlFor="auth-phone">Primary contact number</Label>
                <Input
                  id="auth-phone"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  required
                  inputMode="tel"
                  className="mt-1.5 h-11 rounded-full"
                />
              </div>
            </>
          ) : null}

          <div>
            <Label htmlFor="auth-email">Email</Label>
            <Input
              id="auth-email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              className="mt-1.5 h-11 rounded-full"
            />
          </div>

          <div>
            <Label htmlFor="auth-password">Password</Label>
            <Input
              id="auth-password"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              minLength={mode === "signup" ? 8 : 1}
              className="mt-1.5 h-11 rounded-full"
            />
          </div>

          {error ? <p className="text-sm text-destructive">{error}</p> : null}

          <Button
            type="submit"
            disabled={loading}
            className="h-11 w-full rounded-full bg-teal text-xs font-semibold tracking-[0.12em] text-teal-foreground uppercase hover:bg-teal/90"
          >
            {loading ? (
              <Loader2 className="size-4 animate-spin" />
            ) : mode === "signup" ? (
              "Create account"
            ) : (
              "Log in"
            )}
          </Button>

          <p className="text-center text-sm text-muted-foreground">
            {mode === "signup" ? "Already have an account?" : "New here?"}{" "}
            <button
              type="button"
              className="font-medium text-foreground underline-offset-4 hover:underline"
              onClick={() => {
                setMode(mode === "signup" ? "login" : "signup");
                setError("");
              }}
            >
              {mode === "signup" ? "Log in" : "Create account"}
            </button>
          </p>
        </form>
      </DialogContent>
    </Dialog>
  );
}
