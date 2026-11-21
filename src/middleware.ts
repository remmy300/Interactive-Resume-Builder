import { NextResponse, type NextRequest } from "next/server";

const PUBLIC_PREFIXES = ["/login", "/r", "/try", "/api/auth"];
const SESSION_COOKIES = [
  "authjs.session-token",
  "__Secure-authjs.session-token",
];

/**
 * Edge-safe gate: checks for the presence of the session cookie only. The
 * cookie signature and user lookup still happen in `auth()` on the server, so
 * this is a redirect convenience, not the authorization boundary.
 */
export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  const hasSession = SESSION_COOKIES.some((name) =>
    Boolean(request.cookies.get(name)?.value),
  );

  // The home page only ever redirects, so do it here instead of rendering a
  // page on the server first. `auth()` still decides what a visitor may see.
  if (pathname === "/") {
    const target = request.nextUrl.clone();
    target.pathname = hasSession ? "/dashboard" : "/try";
    target.search = "";
    return NextResponse.redirect(target);
  }

  if (
    PUBLIC_PREFIXES.some(
      (prefix) => pathname === prefix || pathname.startsWith(`${prefix}/`),
    )
  ) {
    return NextResponse.next();
  }

  if (hasSession) return NextResponse.next();

  const loginUrl = request.nextUrl.clone();
  loginUrl.pathname = "/login";
  loginUrl.search = "";
  if (pathname !== "/") {
    loginUrl.searchParams.set("next", `${pathname}${request.nextUrl.search}`);
  }
  return NextResponse.redirect(loginUrl);
}

export const config = {
  // API routes handle their own 401 responses; static assets are skipped.
  matcher: ["/((?!api|_next/static|_next/image|favicon.ico|.*\\..*).*)"],
};
