import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { getToken } from "next-auth/jwt";

export async function middleware(req: NextRequest) {
  // getToken works in edge runtime - use the correct cookie name for NextAuth v5
  const token = await getToken({
    req,
    secret: process.env.AUTH_SECRET,
    cookieName: process.env.NODE_ENV === "production"
      ? "__Secure-authjs.session-token"
      : "authjs.session-token",
  });

  const isLoggedIn = !!token;
  const { pathname } = req.nextUrl;

  // Route categories
  const isClinicianRoute =
    pathname.startsWith("/dashboard") ||
    pathname.startsWith("/notes") ||
    pathname.startsWith("/record") ||
    pathname.startsWith("/settings");

  const isPatientRoute = pathname.startsWith("/portal");

  const isInviteRoute = pathname.startsWith("/invite");

  const isAuthRoute =
    pathname.startsWith("/login") || pathname.startsWith("/register");

  // Unauthenticated users can't access protected routes
  if ((isClinicianRoute || isPatientRoute) && !isLoggedIn) {
    return NextResponse.redirect(new URL("/login", req.nextUrl));
  }

  // Patient trying to access clinician routes -> redirect to portal
  if (isClinicianRoute && isLoggedIn && token.role === "PATIENT") {
    return NextResponse.redirect(new URL("/portal", req.nextUrl));
  }

  // Invite routes should be accessible even when logged in (to redeem new invites)
  if (isInviteRoute) {
    return NextResponse.next();
  }

  // Auth routes: logged in users get redirected to their home
  if (isAuthRoute && isLoggedIn) {
    const home = token.role === "PATIENT" ? "/portal" : "/dashboard";
    return NextResponse.redirect(new URL(home, req.nextUrl));
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|api/webhooks|api/auth|api/mobile-auth|api/audio).*)",
  ],
};
