/**
 * Next.js Middleware — runs on the EDGE before every request.
 *
 * Purpose:
 *  • Protect /dashboard/** and /admin/** routes server-side.
 *  • Redirect unauthenticated users to /login with a ?returnTo query.
 *  • Redirect non-admin users away from /admin/** to /unauthorized.
 *  • Redirect ADMIN users away from /dashboard to /admin.
 *  • Prevent the UI flicker that occurs when client-side auth checks
 *    run after the component has already painted.
 *
 * The middleware reads the `accessToken` httpOnly cookie set by the
 * backend.  Because httpOnly cookies are NOT accessible to client JS
 * but ARE automatically sent by the browser, they show up in
 * `request.cookies` here on the server.
 */

import { NextRequest, NextResponse } from 'next/server';
import { getDefaultRedirectForRole, isOwnerRole, resolvePostLoginRedirect, sanitizeReturnTo } from '@/lib/auth/redirect';

// ── Cookie-based JWT decode (no secret needed for expiry check) ──

/**
 * Decode the JWT payload without verification — we only need to know
 * whether the token is present and not expired.  The actual signature
 * verification still happens in the Express backend.
 */
function decodeJwtPayload(cookie: string): Record<string, unknown> | null {
  try {
    const parts = cookie.split('.');
    if (parts.length !== 3) return null;
    const payload = JSON.parse(
      Buffer.from(parts[1], 'base64').toString('utf-8')
    );
    return payload;
  } catch {
    return null;
  }
}

function isTokenValid(cookieValue: string | undefined): boolean {
  if (!cookieValue) return false;
  const payload = decodeJwtPayload(cookieValue);
  if (!payload) return false;
  const exp = payload.exp as number | undefined;
  if (exp && Date.now() >= exp * 1000) return false;
  return true;
}

/**
 * Frontend and backend can live on different origins, including the same host
 * on different ports. In that setup, backend auth cookies are not reliably
 * readable by frontend middleware, so auth is handled client-side.
 */
function canUseEdgeCookieAuth(request: NextRequest): boolean {
  const apiUrl = process.env.NEXT_PUBLIC_API_URL;
  if (!apiUrl) return true;
  try {
    return new URL(apiUrl).origin === request.nextUrl.origin;
  } catch {
    return true;
  }
}

// ── Route matching ──────────────────────────────────────────────

const DASHBOARD_PATTERN = /^\/dashboard($|\/)/;
const ADMIN_PATTERN = /^\/admin($|\/)/;
const OWNER_PATTERN = /^\/owner($|\/)/;
const LOGIN_PATTERN = /^\/login($|\/)/;
const ROOT_PATTERN = /^\/$/;
const USER_ACCOUNT_PATTERN = /^\/(mes-reservations|profile)($|\/)/;

// Public routes that should never go through auth checks
const PUBLIC_PATTERNS = [
  /^\/_next\//,
  /^\/api\//,          // Let Next.js API routes handle their own auth
  /^\/static\//,
  /^\/favicon/,
  /^\/logo/,
];

// ── Middleware ──────────────────────────────────────────────────

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;
  const edgeCookieAuthEnabled = canUseEdgeCookieAuth(request);

  // Skip middleware for public/static assets
  if (PUBLIC_PATTERNS.some((p) => p.test(pathname))) {
    return NextResponse.next();
  }

  const accessTokenCookie = request.cookies.get('accessToken')?.value;
  const hasValidToken = isTokenValid(accessTokenCookie);

  // Cross-origin API deployment (frontend domain != backend domain):
  // don't enforce cookie-based redirects at the edge.
  if (!edgeCookieAuthEnabled) {
    return NextResponse.next();
  }

  // ── Dashboard routes — redirect to appropriate home ─────────
  if (DASHBOARD_PATTERN.test(pathname)) {
    if (!hasValidToken) {
      const url = new URL('/login', request.url);
      url.searchParams.set('returnTo', pathname);
      return NextResponse.redirect(url);
    }

    const payload = decodeJwtPayload(accessTokenCookie!);
    if (payload?.role === 'ADMIN') {
      // Keep admin dashboard namespace strictly under /admin.
      return NextResponse.redirect(new URL('/admin/dashboard', request.url));
    }

    // Keep old user dashboard links functional through redirects.
    if (pathname === '/dashboard/reservations' || pathname.startsWith('/dashboard/reservations/')) {
      return NextResponse.redirect(new URL('/mes-reservations', request.url));
    }
    if (pathname === '/dashboard/profile') {
      return NextResponse.redirect(new URL('/profile', request.url));
    }

    return NextResponse.redirect(new URL('/', request.url));
  }

  // ── Admin routes ─────────────────────────────────────────────
  if (ADMIN_PATTERN.test(pathname)) {
    if (!hasValidToken) {
      const url = new URL('/login', request.url);
      url.searchParams.set('returnTo', pathname);
      return NextResponse.redirect(url);
    }

    const payload = decodeJwtPayload(accessTokenCookie!);
    if (!payload || payload.role !== 'ADMIN') {
      return NextResponse.redirect(new URL('/unauthorized', request.url));
    }
  }

  if (OWNER_PATTERN.test(pathname)) {
    if (!hasValidToken) {
      const url = new URL('/login', request.url);
      url.searchParams.set('returnTo', pathname);
      return NextResponse.redirect(url);
    }

    const payload = decodeJwtPayload(accessTokenCookie!);
    const role = typeof payload?.role === 'string' ? payload.role : null;
    if (role === 'ADMIN') {
      return NextResponse.redirect(new URL('/admin/dashboard', request.url));
    }
    if (!isOwnerRole(role)) {
      return NextResponse.redirect(new URL('/unauthorized', request.url));
    }
  }

  // ── User account pages (/mes-reservations, /profile) ─────────
  if (USER_ACCOUNT_PATTERN.test(pathname)) {
    if (!hasValidToken) {
      const url = new URL('/login', request.url);
      url.searchParams.set('returnTo', pathname);
      return NextResponse.redirect(url);
    }

    const payload = decodeJwtPayload(accessTokenCookie!);
    if (payload?.role === 'ADMIN') {
      // Admins have a dedicated admin console.
      return NextResponse.redirect(new URL('/admin/dashboard', request.url));
    }
  }

  // ── Logged-in users should not see login page ────────────────
  if (LOGIN_PATTERN.test(pathname) && hasValidToken) {
    const payload = decodeJwtPayload(accessTokenCookie!);
    const role = typeof payload?.role === 'string' ? payload.role : null;
    const requestedReturnTo = sanitizeReturnTo(request.nextUrl.searchParams.get('returnTo'));
    const redirectUrl = requestedReturnTo
      ? resolvePostLoginRedirect(role, requestedReturnTo)
      : getDefaultRedirectForRole(role);
    return NextResponse.redirect(new URL(redirectUrl, request.url));
  }

  // Redirect authenticated users from public home to their role workspace.
  if (ROOT_PATTERN.test(pathname) && hasValidToken) {
    const payload = decodeJwtPayload(accessTokenCookie!);
    const role = typeof payload?.role === 'string' ? payload.role : null;
    if (role === 'ADMIN') {
      return NextResponse.redirect(new URL('/admin/dashboard', request.url));
    }
    if (isOwnerRole(role)) {
      return NextResponse.redirect(new URL('/owner', request.url));
    }
  }

  return NextResponse.next();
}

export const config = {
  // Run middleware on these routes:
  matcher: [
    '/dashboard/:path*',
    '/admin/:path*',
    '/owner/:path*',
    '/mes-reservations/:path*',
    '/profile',
    '/profile/:path*',
    '/login',
    '/',
  ],
};
