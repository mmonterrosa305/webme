import { createServerClient } from "@supabase/auth-helpers-nextjs";
import { type NextRequest, NextResponse } from "next/server";

import { getSupabaseAnonKey, getSupabaseUrl } from "@/lib/supabase/env";

const DASHBOARD_ROUTES = [
  "/overview",
  "/pipeline",
  "/agents",
  "/leads",
  "/import-site",
  "/business-search",
  "/outreach-queue",
  "/outreach",
  "/clients",
  "/revenue",
] as const;

const CLIENT_PROTECTED_ROUTES = ["/client/dashboard"] as const;

function isDashboardRoute(pathname: string) {
  return DASHBOARD_ROUTES.some(
    (route) => pathname === route || pathname.startsWith(`${route}/`),
  );
}

function isClientProtectedRoute(pathname: string) {
  return CLIENT_PROTECTED_ROUTES.some(
    (route) => pathname === route || pathname.startsWith(`${route}/`),
  );
}

function isClientPortalUser(user: { user_metadata?: Record<string, unknown> }) {
  return user.user_metadata?.app_role === "client";
}

export async function middleware(request: NextRequest) {
  let response = NextResponse.next({ request });

  const supabase = createServerClient(
    getSupabaseUrl(),
    getSupabaseAnonKey(),
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) => {
            request.cookies.set(name, value);
          });
          response = NextResponse.next({ request });
          cookiesToSet.forEach(({ name, value, options }) => {
            response.cookies.set(name, value, options);
          });
        },
      },
    },
  );

  const {
    data: { user },
  } = await supabase.auth.getUser();

  const pathname = request.nextUrl.pathname;

  if (!user && isDashboardRoute(pathname)) {
    const loginUrl = request.nextUrl.clone();
    loginUrl.pathname = "/login";
    return NextResponse.redirect(loginUrl);
  }

  if (user && isDashboardRoute(pathname) && isClientPortalUser(user)) {
    const clientDashboardUrl = request.nextUrl.clone();
    clientDashboardUrl.pathname = "/client/dashboard";
    return NextResponse.redirect(clientDashboardUrl);
  }

  if (!user && isClientProtectedRoute(pathname)) {
    const clientLoginUrl = request.nextUrl.clone();
    clientLoginUrl.pathname = "/client/login";
    return NextResponse.redirect(clientLoginUrl);
  }

  return response;
}

export const config = {
  matcher: [
    "/overview/:path*",
    "/pipeline/:path*",
    "/agents/:path*",
    "/leads/:path*",
    "/import-site/:path*",
    "/business-search/:path*",
    "/outreach-queue/:path*",
    "/outreach/:path*",
    "/clients/:path*",
    "/revenue/:path*",
    "/client/dashboard/:path*",
  ],
};
