import { NextRequest, NextResponse } from "next/server";
import { SESSION_COOKIE_NAME } from "@/lib/auth/constants";

const protectedPrefixes = [
  "/dashboard",
  "/leads",
  "/students",
  "/payments",
  "/messages",
  "/settings"
  ,"/training"
];

const protectedApiPrefixes = [
  "/api/dashboard",
  "/api/leads",
  "/api/students",
  "/api/payments",
  "/api/messages",
  "/api/settings"
  ,"/api/training-sessions"
];

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;
  const hasSessionCookie = Boolean(request.cookies.get(SESSION_COOKIE_NAME)?.value);
  const isProtectedPage = protectedPrefixes.some((prefix) =>
    pathname.startsWith(prefix)
  );
  const isProtectedApi = protectedApiPrefixes.some((prefix) =>
    pathname.startsWith(prefix)
  );

  if (isProtectedPage && !hasSessionCookie) {
    const url = request.nextUrl.clone();
    url.pathname = "/sign-in";
    url.searchParams.set("next", pathname);
    return NextResponse.redirect(url);
  }

  if (isProtectedApi && !hasSessionCookie) {
    return NextResponse.json(
      { error: { code: "UNAUTHORIZED", message: "Sign in required" } },
      { status: 401 }
    );
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    "/dashboard/:path*",
    "/leads/:path*",
    "/students/:path*",
    "/payments/:path*",
    "/messages/:path*",
    "/settings/:path*",
    "/training/:path*",
    "/api/dashboard/:path*",
    "/api/leads/:path*",
    "/api/students/:path*",
    "/api/payments/:path*",
    "/api/messages/:path*",
    "/api/settings/:path*"
    ,"/api/training-sessions/:path*"
  ]
};
