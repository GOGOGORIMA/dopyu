import { NextResponse, type NextRequest } from "next/server";
import { SESSION_COOKIE_NAME, verifySessionToken } from "@/lib/auth/token";

/**
 * Optimistic auth check (Next.js 16 Proxy, formerly Middleware).
 * - Sends logged-out visitors to /login
 * - Sends logged-in users away from /login and /register to home
 * The real authorization happens again in the DAL (src/lib/auth/dal.ts) for every API call and data read.
 */
const PUBLIC_PATHS = new Set(["/login", "/register"]);

export async function proxy(request: NextRequest) {
  const { pathname, search } = request.nextUrl;
  const session = await verifySessionToken(request.cookies.get(SESSION_COOKIE_NAME)?.value);
  const isPublic = PUBLIC_PATHS.has(pathname);

  if (!session && !isPublic) {
    const loginUrl = new URL("/login", request.url);
    if (pathname !== "/") loginUrl.searchParams.set("next", `${pathname}${search}`);
    return NextResponse.redirect(loginUrl);
  }
  if (session && isPublic) {
    return NextResponse.redirect(new URL("/", request.url));
  }
  return NextResponse.next();
}

export const config = {
  // Skip API routes (they return 401 themselves), static assets, and files with an extension
  matcher: ["/((?!api|_next/static|_next/image|favicon.ico|.*\\..*).*)"],
};
