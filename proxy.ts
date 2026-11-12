import { NextResponse, type NextRequest } from "next/server";
import { SESSION_COOKIE, isValidSession } from "@/lib/auth";

/**
 * Passcode gate. Every page and API needs a valid session cookie, except:
 * - "/" itself, which renders the landing page for signed-out visitors (see app/page.tsx),
 * - the login API and the health check,
 * - static assets (excluded by the matcher), so link-preview images and icons stay public.
 * Signed-out visits to any other page go to "/". /login always goes to "/" so it never shows in the URL.
 */
export async function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;
  if (pathname === "/login") return redirectHome(request);
  if (pathname === "/") return NextResponse.next();

  const ok = await isValidSession(request.cookies.get(SESSION_COOKIE)?.value);
  if (ok) return NextResponse.next();

  if (pathname.startsWith("/api/")) {
    return NextResponse.json({ error: "Not logged in" }, { status: 401 });
  }
  return redirectHome(request);
}

function redirectHome(request: NextRequest) {
  const url = request.nextUrl.clone();
  url.pathname = "/";
  url.search = "";
  return NextResponse.redirect(url);
}

export const config = {
  matcher: ["/((?!api/login|api/health|_next/static|_next/image|favicon.ico|.*\\.(?:png|jpg|jpeg|gif|svg|ico|webp|txt|xml)$).*)"],
};
