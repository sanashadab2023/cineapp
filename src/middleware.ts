import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { jwtVerify } from "jose";

const JWT_SECRET = new TextEncoder().encode(
  process.env.JWT_SECRET || "cinebook_super_secret_jwt_key_min_32_chars_long_change_in_prod"
);

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;
  const sessionToken = request.cookies.get("cinebook_session")?.value;

  // Protected paths
  const isAuthRequired =
    pathname.startsWith("/bookings") ||
    pathname.startsWith("/checkout") ||
    pathname.startsWith("/admin");

  const isAdminRequired = pathname.startsWith("/admin");

  if (!isAuthRequired) {
    return NextResponse.next();
  }

  if (!sessionToken) {
    const loginUrl = new URL("/login", request.url);
    loginUrl.searchParams.set("redirect", pathname);
    return NextResponse.redirect(loginUrl);
  }

  try {
    const { payload } = await jwtVerify(sessionToken, JWT_SECRET);

    if (isAdminRequired && payload.role !== "ADMIN") {
      // Forbidden: redirect to home or login
      return NextResponse.redirect(new URL("/login?error=admin_required", request.url));
    }

    return NextResponse.next();
  } catch (err) {
    // Invalid or expired token
    const loginUrl = new URL("/login", request.url);
    loginUrl.searchParams.set("redirect", pathname);
    return NextResponse.redirect(loginUrl);
  }
}

export const config = {
  matcher: ["/bookings/:path*", "/checkout/:path*", "/admin/:path*"],
};
