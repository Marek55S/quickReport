import { NextResponse, type NextRequest } from "next/server";
import { isAdminRequest } from "@/lib/auth";

// First line of defence for the official dashboard; admin route handlers check the session again.
export function proxy(request: NextRequest) {
  const { pathname, search } = request.nextUrl;
  if (pathname === "/admin/login" || isAdminRequest(request)) {
    return NextResponse.next();
  }
  if (pathname.startsWith("/api/")) {
    return NextResponse.json({ error: "Wymagane logowanie" }, { status: 401 });
  }
  const login = new URL("/admin/login", request.url);
  login.searchParams.set("next", pathname + search);
  return NextResponse.redirect(login);
}

export const config = {
  matcher: ["/admin/:path*", "/api/tickets/:path*"],
};
