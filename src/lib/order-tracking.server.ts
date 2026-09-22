import "server-only";

import { createHmac, timingSafeEqual } from "crypto";
import { cookies } from "next/headers";
import type { NextResponse } from "next/server";

import { TRACKING_COOKIE_NAME } from "@/lib/commerce-constants";
import type { Order } from "@/lib/commerce-types";
import { findOrderByNumber } from "@/lib/commerce.server";
import { getShippingSettings } from "@/lib/shipping.server";
import {
  expectedDeliveryForOrder,
  toGuestOrderTracking,
  type GuestOrderTracking,
} from "@/lib/order-tracking";

const TRACK_MAX_AGE_SECONDS = 60 * 15;
const VERIFY_WINDOW_MS = 15 * 60 * 1000;
const MAX_ATTEMPTS = 5;

type Challenge = { startedAt: number; attempts: number };
type AttemptBucket = { startedAt: number; count: number };

const challenges = new Map<string, Challenge>();
const attemptsByIp = new Map<string, AttemptBucket>();

function cleanEnv(value: string | undefined, fallback: string) {
  const raw = (value ?? fallback).trim();
  return raw.replace(/^["']|["']$/g, "").trim();
}

function getSecret() {
  return cleanEnv(
    process.env["CUSTOMER_SESSION_SECRET"] || process.env["ADMIN_SESSION_SECRET"],
    "ab-collection-customer-dev-secret",
  );
}

function sign(value: string, secret: string) {
  return createHmac("sha256", secret).update(value).digest("base64url");
}

function encodeTrackToken(orderNumber: string) {
  const payload = Buffer.from(
    JSON.stringify({ on: orderNumber, exp: Date.now() + TRACK_MAX_AGE_SECONDS * 1000 }),
  ).toString("base64url");
  return `${payload}.${sign(payload, getSecret())}`;
}

function decodeTrackToken(token: string): { orderNumber: string } | null {
  const [payload, signature] = token.split(".");
  if (!payload || signature == null) return null;
  const expected = sign(payload, getSecret());
  const a = Buffer.from(signature);
  const b = Buffer.from(expected);
  if (a.length !== b.length || !timingSafeEqual(a, b)) return null;
  try {
    const data = JSON.parse(Buffer.from(payload, "base64url").toString("utf8")) as {
      on?: string;
      exp?: number;
    };
    if (!data.on || !data.exp || Date.now() > data.exp) return null;
    return { orderNumber: data.on };
  } catch {
    return null;
  }
}

function phoneLast4(value: string | null | undefined) {
  const digits = String(value ?? "").replace(/\D/g, "");
  return digits.length >= 4 ? digits.slice(-4) : "";
}

function equalDigits(left: string, right: string) {
  const a = Buffer.from(left.padEnd(4, "0"));
  const b = Buffer.from(right.padEnd(4, "0"));
  if (a.length !== b.length) return false;
  return timingSafeEqual(a, b) && left.length === 4 && right.length === 4;
}

function prune(map: Map<string, { startedAt: number }>, windowMs: number) {
  const cutoff = Date.now() - windowMs;
  for (const [key, value] of map) {
    if (value.startedAt < cutoff) map.delete(key);
  }
}

function tooManyAttempts(ip: string, orderNumber: string) {
  prune(attemptsByIp, VERIFY_WINDOW_MS);
  const key = `${ip}:${orderNumber}`;
  const bucket = attemptsByIp.get(key);
  if (!bucket) {
    attemptsByIp.set(key, { startedAt: Date.now(), count: 1 });
    return false;
  }
  bucket.count += 1;
  return bucket.count > MAX_ATTEMPTS;
}

export function attachTrackingCookie(response: NextResponse, orderNumber: string) {
  response.cookies.set(TRACKING_COOKIE_NAME, encodeTrackToken(orderNumber), {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: TRACK_MAX_AGE_SECONDS,
  });
}

export async function requestGuestTracking(orderNumber: string) {
  const normalized = orderNumber.trim().toUpperCase();
  if (normalized.length < 5) {
    throw Object.assign(new Error("Please check your order number and try again."), {
      status: 400,
    });
  }
  challenges.set(normalized, { startedAt: Date.now(), attempts: 0 });
  return { ok: true as const };
}

export async function verifyGuestTracking(
  orderNumber: string,
  last4: string,
  ip: string,
): Promise<GuestOrderTracking> {
  const normalized = orderNumber.trim().toUpperCase();
  const code = last4.replace(/\D/g, "");
  if (tooManyAttempts(ip, normalized) || code.length !== 4) {
    throw Object.assign(new Error("Verification failed. Please try again."), { status: 401 });
  }

  const challenge = challenges.get(normalized);
  if (!challenge) {
    throw Object.assign(new Error("Verification failed. Please try again."), { status: 401 });
  }
  if (Date.now() - challenge.startedAt > VERIFY_WINDOW_MS) {
    challenges.delete(normalized);
    throw Object.assign(
      new Error("Your verification has expired. Please request a new verification code."),
      { status: 401 },
    );
  }
  challenge.attempts += 1;
  if (challenge.attempts > MAX_ATTEMPTS) {
    throw Object.assign(new Error("Verification failed. Please try again."), { status: 401 });
  }

  const order = await findOrderByNumber(normalized);
  const stored = phoneLast4(order?.customerPhone) || phoneLast4(order?.alternatePhone);
  if (!order || !equalDigits(stored, code)) {
    throw Object.assign(new Error("Verification failed. Please try again."), { status: 401 });
  }

  challenges.delete(normalized);
  const settings = await getShippingSettings();
  return toGuestOrderTracking(order, settings);
}

export async function getGuestTrackingFromCookie(): Promise<GuestOrderTracking | null> {
  const jar = await cookies();
  const token = jar.get(TRACKING_COOKIE_NAME)?.value;
  if (!token) return null;
  const decoded = decodeTrackToken(token);
  if (!decoded) {
    throw Object.assign(
      new Error("Your verification has expired. Please request a new verification code."),
      {
        status: 401,
      },
    );
  }
  const order = await findOrderByNumber(decoded.orderNumber);
  if (!order) return null;
  const settings = await getShippingSettings();
  return toGuestOrderTracking(order, settings);
}

export async function withExpectedDelivery(orders: Order[]): Promise<Order[]> {
  const settings = await getShippingSettings();
  return orders.map((order) => ({
    ...order,
    expectedDelivery: expectedDeliveryForOrder(order, settings),
  }));
}
