import "server-only";

import { createHmac, timingSafeEqual } from "crypto";
import { cookies } from "next/headers";
import type { NextResponse } from "next/server";

import { ADMIN_COOKIE_NAME } from "@/lib/admin-constants";

export { ADMIN_COOKIE_NAME };

const MAX_AGE_SECONDS = 60 * 60 * 12; // 12 hours

function cleanEnv(value: string | undefined, fallback: string) {
  const raw = (value ?? fallback).trim();
  return raw.replace(/^["']|["']$/g, "").trim();
}

function getCredentials() {
  return {
    username: cleanEnv(process.env["ADMIN_USERNAME"], "Abbass Badwahwala"),
    password: cleanEnv(process.env["ADMIN_PASSWORD"], "Abbass@786"),
    secret: cleanEnv(process.env["ADMIN_SESSION_SECRET"], "ab-collection-admin-dev-secret"),
  };
}

function sign(value: string, secret: string) {
  return createHmac("sha256", secret).update(value).digest("base64url");
}

function encodeSession(username: string, secret: string) {
  const payload = Buffer.from(
    JSON.stringify({ u: username, exp: Date.now() + MAX_AGE_SECONDS * 1000 }),
  ).toString("base64url");
  return `${payload}.${sign(payload, secret)}`;
}

function decodeSession(token: string, secret: string): { username: string } | null {
  const [payload, signature] = token.split(".");
  if (!payload || !signature) return null;
  const expected = sign(payload, secret);
  const a = Buffer.from(signature);
  const b = Buffer.from(expected);
  if (a.length !== b.length || !timingSafeEqual(a, b)) return null;

  try {
    const data = JSON.parse(Buffer.from(payload, "base64url").toString("utf8")) as {
      u?: string;
      exp?: number;
    };
    if (!data.u || !data.exp || Date.now() > data.exp) return null;
    return { username: data.u };
  } catch {
    return null;
  }
}

function normalizeUsername(value: string) {
  return value.trim().replace(/\s+/g, " ").toLowerCase();
}

export function verifyAdminCredentials(username: string, password: string) {
  const creds = getCredentials();
  const userOk = normalizeUsername(username) === normalizeUsername(creds.username);
  const passA = Buffer.from(password);
  const passB = Buffer.from(creds.password);
  const passOk = passA.length === passB.length && timingSafeEqual(passA, passB);
  return userOk && passOk;
}

export function attachAdminSessionCookie(response: NextResponse, username: string) {
  const { secret } = getCredentials();
  const token = encodeSession(username, secret);
  response.cookies.set(ADMIN_COOKIE_NAME, token, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: MAX_AGE_SECONDS,
  });
}

export function clearAdminSessionCookie(response: NextResponse) {
  response.cookies.set(ADMIN_COOKIE_NAME, "", {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: 0,
  });
}

export async function createAdminSession(username: string) {
  const { secret } = getCredentials();
  const token = encodeSession(username, secret);
  const jar = await cookies();
  jar.set(ADMIN_COOKIE_NAME, token, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: MAX_AGE_SECONDS,
  });
}

export async function destroyAdminSession() {
  const jar = await cookies();
  jar.set(ADMIN_COOKIE_NAME, "", {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: 0,
  });
}

export async function getAdminSession() {
  const jar = await cookies();
  const token = jar.get(ADMIN_COOKIE_NAME)?.value;
  if (!token) return null;
  const { secret } = getCredentials();
  return decodeSession(token, secret);
}

export async function requireAdminSession() {
  const session = await getAdminSession();
  if (!session) throw new Error("Unauthorized");
  return session;
}
