"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { FormEvent, Suspense, useState } from "react";
import { Loader2 } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

function LoginForm() {
  const router = useRouter();
  const search = useSearchParams();
  const next = search.get("next") || "/admin";
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const onSubmit = async (event: FormEvent) => {
    event.preventDefault();
    setLoading(true);
    setError("");
    try {
      const res = await fetch("/api/admin/auth", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ username, password }),
      });
      const data = (await res.json()) as { error?: string };
      if (!res.ok) throw new Error(data.error ?? "Login failed");
      router.replace(next.startsWith("/admin") ? next : "/admin");
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Login failed");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-[#f7f7f5] px-5">
      <form
        onSubmit={onSubmit}
        className="w-full max-w-md rounded-3xl border border-border bg-white p-8 shadow-sm"
      >
        <p className="font-display text-3xl font-bold">AB Admin</p>
        <p className="mt-2 text-sm text-muted-foreground">
          Sign in to manage products and collections.
        </p>

        <div className="mt-8 space-y-4">
          <div>
            <label htmlFor="admin-user" className="text-sm font-medium">
              Login ID
            </label>
            <Input
              id="admin-user"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              className="mt-2 h-11 rounded-xl"
              autoComplete="username"
              required
            />
          </div>
          <div>
            <label htmlFor="admin-pass" className="text-sm font-medium">
              Password
            </label>
            <Input
              id="admin-pass"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="mt-2 h-11 rounded-xl"
              autoComplete="current-password"
              required
            />
          </div>
        </div>

        {error ? <p className="mt-4 text-sm text-destructive">{error}</p> : null}

        <Button
          type="submit"
          disabled={loading}
          className="mt-6 h-12 w-full rounded-full bg-teal text-teal-foreground"
        >
          {loading ? <Loader2 className="size-4 animate-spin" /> : null}
          Sign in
        </Button>
      </form>
    </div>
  );
}

export default function AdminLoginPage() {
  return (
    <Suspense fallback={<div className="min-h-screen bg-[#f7f7f5]" />}>
      <LoginForm />
    </Suspense>
  );
}
