import "server-only";

import { createHmac, randomUUID, timingSafeEqual } from "crypto";
import { cookies } from "next/headers";
import type { NextResponse } from "next/server";
import bcrypt from "bcryptjs";

import { CUSTOMER_COOKIE_NAME, IMPORTED_CUSTOMER_PASSWORD } from "@/lib/commerce-constants";
import type { CustomerPublic, LoginInput, SignupInput } from "@/lib/commerce-types";
import { normalizeMobile } from "@/lib/reservation-utils";
import {
  createCustomerRecord,
  findCustomerByEmail,
  findCustomerById,
  setCustomerPasswordHash,
  updateCustomerProfile,
  type CustomerRecord,
} from "@/lib/commerce.server";

const MAX_AGE_SECONDS = 60 * 60 * 24 * 30; // 30 days

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

function encodeSession(customerId: string, secret: string) {
  const payload = Buffer.from(
    JSON.stringify({ cid: customerId, exp: Date.now() + MAX_AGE_SECONDS * 1000 }),
  ).toString("base64url");
  return `${payload}.${sign(payload, secret)}`;
}

function decodeSession(token: string, secret: string): { customerId: string } | null {
  const [payload, signature] = token.split(".");
  if (!payload || !signature) return null;
  const expected = sign(payload, secret);
  const a = Buffer.from(signature);
  const b = Buffer.from(expected);
  if (a.length !== b.length || !timingSafeEqual(a, b)) return null;

  try {
    const data = JSON.parse(Buffer.from(payload, "base64url").toString("utf8")) as {
      cid?: string;
      exp?: number;
    };
    if (!data.cid || !data.exp || Date.now() > data.exp) return null;
    return { customerId: data.cid };
  } catch {
    return null;
  }
}

export function toPublicCustomer(row: CustomerRecord): CustomerPublic {
  return {
    id: row.id,
    email: row.email,
    fullName: row.fullName,
    phone: row.phone,
    alternatePhone: row.alternatePhone,
    status: row.status,
    createdAt: row.createdAt,
  };
}

export function attachCustomerSessionCookie(response: NextResponse, customerId: string) {
  const token = encodeSession(customerId, getSecret());
  response.cookies.set(CUSTOMER_COOKIE_NAME, token, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: MAX_AGE_SECONDS,
  });
}

export function clearCustomerSessionCookie(response: NextResponse) {
  response.cookies.set(CUSTOMER_COOKIE_NAME, "", {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: 0,
  });
}

export async function getCustomerSession(): Promise<CustomerPublic | null> {
  const jar = await cookies();
  const token = jar.get(CUSTOMER_COOKIE_NAME)?.value;
  if (!token) return null;
  const decoded = decodeSession(token, getSecret());
  if (!decoded) return null;
  const customer = await findCustomerById(decoded.customerId);
  if (!customer || customer.status !== "active") return null;
  return toPublicCustomer(customer);
}

export async function requireCustomerSession(): Promise<CustomerPublic> {
  const session = await getCustomerSession();
  if (!session) {
    const err = new Error("Unauthorized");
    (err as Error & { status: number }).status = 401;
    throw err;
  }
  return session;
}

export async function signupCustomer(input: SignupInput) {
  const email = input.email.trim().toLowerCase();
  const phone = normalizeMobile(input.phone);
  if (!phone)
    throw Object.assign(new Error("Enter a valid 10-digit Indian mobile number."), { status: 400 });

  const existing = await findCustomerByEmail(email);
  if (existing) {
    if (existing.passwordHash !== IMPORTED_CUSTOMER_PASSWORD) {
      throw Object.assign(new Error("An account with this email already exists."), { status: 409 });
    }
    const passwordHash = await bcrypt.hash(input.password, 12);
    const updated = await setCustomerPasswordHash(existing.id, passwordHash);
    const customer = await updateCustomerProfile(updated.id, {
      fullName: input.fullName.trim(),
      phone,
      alternatePhone: updated.alternatePhone,
    });
    return toPublicCustomer(customer);
  }

  const passwordHash = await bcrypt.hash(input.password, 12);
  const now = new Date().toISOString();
  const customer = await createCustomerRecord({
    id: randomUUID(),
    email,
    passwordHash,
    fullName: input.fullName.trim(),
    phone,
    alternatePhone: null,
    status: "active",
    createdAt: now,
    updatedAt: now,
  });

  return toPublicCustomer(customer);
}

export async function loginCustomer(input: LoginInput) {
  const email = input.email.trim().toLowerCase();
  const customer = await findCustomerByEmail(email);
  if (!customer || customer.status !== "active") {
    throw Object.assign(new Error("Invalid email or password."), { status: 401 });
  }
  if (customer.passwordHash === IMPORTED_CUSTOMER_PASSWORD) {
    throw Object.assign(
      new Error("Please create an account with this email to set a password for your reservation."),
      { status: 401 },
    );
  }
  let ok = false;
  try {
    ok = await bcrypt.compare(input.password, customer.passwordHash);
  } catch {
    ok = false;
  }
  if (!ok) throw Object.assign(new Error("Invalid email or password."), { status: 401 });
  return toPublicCustomer(customer);
}
