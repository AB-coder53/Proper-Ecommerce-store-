import "server-only";

import { createClient, type SupabaseClient } from "@supabase/supabase-js";

import type { Database } from "@/integrations/supabase/types";

function isNewSupabaseApiKey(value: string): boolean {
  return value.startsWith("sb_publishable_") || value.startsWith("sb_secret_");
}

function createSupabaseFetch(supabaseKey: string): typeof fetch {
  return (input, init) => {
    const headers = new Headers(
      typeof Request !== "undefined" && input instanceof Request ? input.headers : undefined,
    );

    if (init?.headers) {
      new Headers(init.headers).forEach((value, key) => headers.set(key, value));
    }

    if (
      isNewSupabaseApiKey(supabaseKey) &&
      headers.get("Authorization") === `Bearer ${supabaseKey}`
    ) {
      headers.delete("Authorization");
    }

    headers.set("apikey", supabaseKey);
    return fetch(input, { ...init, headers });
  };
}

function createClientWithKey(url: string, key: string): SupabaseClient<Database> {
  return createClient<Database>(url, key, {
    global: { fetch: createSupabaseFetch(key) },
    auth: {
      persistSession: false,
      autoRefreshToken: false,
    },
  });
}

/** Public read client (publishable key). Safe for storefront SELECTs with RLS. */
export function getSupabaseReadClient(): SupabaseClient<Database> {
  const url = process.env["SUPABASE_URL"] || process.env["NEXT_PUBLIC_SUPABASE_URL"];
  const key =
    process.env["NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY"] ||
    process.env["SUPABASE_PUBLISHABLE_KEY"] ||
    process.env["NEXT_PUBLIC_SUPABASE_ANON_KEY"];

  if (!url || !key) {
    throw new Error("Missing Supabase URL or publishable key for catalogue reads.");
  }

  return createClientWithKey(url, key);
}

/** Admin write client (service role). Required for create/update/delete. */
export function getSupabaseWriteClient(): SupabaseClient<Database> {
  const url = process.env["SUPABASE_URL"] || process.env["NEXT_PUBLIC_SUPABASE_URL"];
  const key = process.env["SUPABASE_SERVICE_ROLE_KEY"];

  if (!url || !key) {
    throw new Error(
      "SUPABASE_SERVICE_ROLE_KEY is required for admin catalogue writes. Add it in .env from Supabase → Project Settings → API.",
    );
  }

  return createClientWithKey(url, key);
}
