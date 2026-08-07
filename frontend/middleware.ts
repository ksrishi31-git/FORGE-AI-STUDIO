import { NextResponse, type NextRequest } from "next/server";

import { env } from "@/lib/config/env";

/**
 * Route protection (Phase 3.2). The backend refresh token is an httpOnly
 * cookie; its presence gates protected routes. Actual identity verification
 * happens server-side via /api/v1/auth/me on the protected pages.
 */
export function middleware(request: NextRequest) {
  const { pathname, search } = request.nextUrl;
  const hasSession = request.cookies.has(env.NEXT_PUBLIC_AUTH_COOKIE);

  if (!hasSession) {
    const loginUrl = request.nextUrl.clone();
    loginUrl.pathname = "/auth/login";
    loginUrl.searchParams.set("next", `${pathname}${search}`);
    return NextResponse.redirect(loginUrl);
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    "/dashboard/:path*",
    "/projects/:path*",
    "/workspace/:path*",
    "/agents/:path*",
    "/architecture/:path*",
    "/documentation/:path*",
    "/deployment/:path*",
    "/settings/:path*",
    "/profile/:path*",
  ],
};
