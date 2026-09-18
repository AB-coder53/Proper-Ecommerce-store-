import { NextResponse } from "next/server";

import {
  attachAdminSessionCookie,
  clearAdminSessionCookie,
  getAdminSession,
  verifyAdminCredentials,
} from "@/lib/admin-auth.server";

export async function GET() {
  const session = await getAdminSession();
  // Use 200 so browsers don't log a noisy 401 on session checks
  return NextResponse.json(
    session ? { authenticated: true, username: session.username } : { authenticated: false },
  );
}

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as { username?: string; password?: string };
    const username = String(body.username ?? "").trim();
    const password = String(body.password ?? "");

    if (!username || !password) {
      return NextResponse.json({ error: "Username and password are required." }, { status: 400 });
    }

    if (!verifyAdminCredentials(username, password)) {
      return NextResponse.json(
        { error: "Invalid login credentials. Use: Abbass Badwahwala / Abbass@786" },
        { status: 401 },
      );
    }

    const response = NextResponse.json({ ok: true, username });
    attachAdminSessionCookie(response, username);
    return response;
  } catch (error) {
    console.error("[admin/login]", error);
    return NextResponse.json({ error: "Login failed." }, { status: 500 });
  }
}

export async function DELETE() {
  const response = NextResponse.json({ ok: true });
  clearAdminSessionCookie(response);
  return response;
}
