import { NextResponse, type NextRequest } from "next/server";

import { ADMIN_COOKIE_NAME } from "@/lib/admin-constants";
import { SITE_URL, WHOLESALE_PATH, WHOLESALE_REDIRECT_HOSTS } from "@/lib/site";

const wholesaleHosts = new Set(WHOLESALE_REDIRECT_HOSTS.map((host) => host.toLowerCase()));

function redirectWholesaleDomain(request: NextRequest) {
  const hostname = request.nextUrl.hostname.toLowerCase();
  if (!wholesaleHosts.has(hostname)) return null;

  const destination = new URL(WHOLESALE_PATH, SITE_URL);
  destination.search = request.nextUrl.search;
  return NextResponse.redirect(destination, 308);
}

export function middleware(request: NextRequest) {
  const wholesaleRedirect = redirectWholesaleDomain(request);
  if (wholesaleRedirect) return wholesaleRedirect;

  const { pathname } = request.nextUrl;
  if (!pathname.startsWith("/admin") || pathname === "/admin/login") {
    return NextResponse.next();
  }

  const token = request.cookies.get(ADMIN_COOKIE_NAME)?.value;
  if (!token) {
    const url = request.nextUrl.clone();
    url.pathname = "/admin/login";
    url.searchParams.set("next", pathname);
    return NextResponse.redirect(url);
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    "/admin/:path*",
    "/wholesale",
    {
      source: "/:path*",
      has: [{ type: "host", value: "abcollection.mrch.in" }],
    },
    {
      source: "/:path*",
      has: [{ type: "host", value: "www.abcollection.mrch.in" }],
    },
  ],
};
