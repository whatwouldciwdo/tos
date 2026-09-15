import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

import { rateLimiter, RATE_LIMIT_CONFIGS } from "@/lib/rate-limit";

const JWT_SECRET = process.env.JWT_SECRET!;

/**
 * Get client identifier for rate limiting
 * Uses userId for authenticated requests, IP for public endpoints
 */
function getClientId(req: NextRequest, userId?: number): string {
  if (userId) {
    return `user:${userId}`;
  }
  
  // Get IP from headers (NextRequest doesn't have .ip property directly)
  const forwarded = req.headers.get('x-forwarded-for');
  const realIp = req.headers.get('x-real-ip');
  const ip = forwarded ? forwarded.split(',')[0].trim() : realIp || 'unknown';
  return `ip:${ip}`;
}

export function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl;
  const token = req.cookies.get("auth-token")?.value || null;

  let isAuthenticated = !!token;
  let isSuperAdmin = false;
  let userId: number | undefined;

  // We skip decoding JWT payload here because jsonwebtoken and Buffer 
  // are not reliably supported in Edge runtime. The actual verification 
  // is done in Server Components (auth.ts) and API Routes.

  // === RATE LIMITING ===
  // Apply rate limiting to API routes
  if (pathname.startsWith('/api/')) {
    // Skip rate limiting for debugging
    if (true) {

      return NextResponse.next();
    }

    let rateLimitConfig = RATE_LIMIT_CONFIGS.general;
    let clientId = getClientId(req, userId);

    // Special rate limits for specific endpoints
    if (pathname === '/api/login') {
      rateLimitConfig = RATE_LIMIT_CONFIGS.login;
      clientId = getClientId(req); // Use IP for login attempts
    } else if (pathname.startsWith('/api/tor') && req.method === 'POST') {
      rateLimitConfig = RATE_LIMIT_CONFIGS.createTor;
    } else if (pathname.startsWith('/api/tor') && (req.method === 'PUT' || req.method === 'PATCH')) {
      rateLimitConfig = RATE_LIMIT_CONFIGS.updateTor;
    }

    // Check rate limit
    const rateLimitResult = rateLimiter.check(clientId, rateLimitConfig);

    if (!rateLimitResult.allowed) {
      const response = NextResponse.json(
        {
          error: {
            message: 'Terlalu banyak request. Silakan coba lagi nanti.',
            code: 'RATE_LIMIT_EXCEEDED',
            resetAt: new Date(rateLimitResult.resetAt).toISOString(),
          },
        },
        { status: 429 }
      );

      response.headers.set('Retry-After', Math.ceil((rateLimitResult.resetAt - Date.now()) / 1000).toString());
      response.headers.set('X-RateLimit-Limit', rateLimitConfig.maxRequests.toString());
      response.headers.set('X-RateLimit-Remaining', '0');
      response.headers.set('X-RateLimit-Reset', Math.ceil(rateLimitResult.resetAt / 1000).toString());

      return response;
    }

    // Add rate limit headers to successful response and return immediately for API routes
    const response = NextResponse.next();
    response.headers.set('X-RateLimit-Limit', rateLimitConfig.maxRequests.toString());
    response.headers.set('X-RateLimit-Remaining', rateLimitResult.remaining.toString());
    response.headers.set('X-RateLimit-Reset', Math.ceil(rateLimitResult.resetAt / 1000).toString());
    
    return response; // Return here for API routes
  }

  const protectedPaths = ["/dashboard", "/admin", "/tor"];
  const adminPaths = ["/admin"];

  const isProtected = protectedPaths.some((p) =>
    pathname === p || pathname.startsWith(p + "/")
  );
  const isAdminPath = adminPaths.some((p) =>
    pathname === p || pathname.startsWith(p + "/")
  );

  // Belum login tapi akses protected → ke /login
  if (isProtected && !isAuthenticated) {
    const loginUrl = new URL("/login?debug=not_auth&token=" + (token ? "present" : "missing"), req.url);
    return NextResponse.redirect(loginUrl);
  }

  // Sudah login tapi akses /login → lempar ke /dashboard
  if (pathname === "/login" && isAuthenticated) {
    const dashUrl = new URL("/dashboard", req.url);
    return NextResponse.redirect(dashUrl);
  }

  // Bukan super admin tapi akses /admin → balikin ke /dashboard
  if (isAdminPath && isAuthenticated && !isSuperAdmin) {
    const dashUrl = new URL("/dashboard", req.url);
    return NextResponse.redirect(dashUrl);
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/login", "/dashboard/:path*", "/admin/:path*", "/tor/:path*", "/api/:path*"],
};
