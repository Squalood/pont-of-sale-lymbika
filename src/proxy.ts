import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

const PUBLIC_ROUTES = ["/login"];

export function proxy(request: NextRequest) {
  const token = request.cookies.get("pos_jwt")?.value;
  const { pathname } = request.nextUrl;

  // Already logged in → redirect away from login
  if (token && pathname === "/login") {
    return NextResponse.redirect(new URL("/", request.url));
  }

  // Not logged in → redirect to login
  if (!token && !PUBLIC_ROUTES.includes(pathname)) {
    return NextResponse.redirect(new URL("/login", request.url));
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico|icon.svg|logo.svg|.*\\.svg).*)"],
};
