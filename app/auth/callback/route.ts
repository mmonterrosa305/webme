import { createServerClient } from "@supabase/auth-helpers-nextjs";
import type { EmailOtpType } from "@supabase/supabase-js";
import { cookies } from "next/headers";
import { NextResponse } from "next/server";

import {
  CLIENT_DASHBOARD_PATH,
  getClientPortalAppUrl,
} from "@/lib/client-auth/app-url";
import { getSupabaseAnonKey, getSupabaseUrl } from "@/lib/supabase/env";

function isEmailOtpType(value: string | null): value is EmailOtpType {
  return (
    value === "signup" ||
    value === "invite" ||
    value === "magiclink" ||
    value === "recovery" ||
    value === "email_change" ||
    value === "email"
  );
}

export async function GET(request: Request) {
  const requestUrl = new URL(request.url);
  const code = requestUrl.searchParams.get("code");
  const tokenHash = requestUrl.searchParams.get("token_hash");
  const otpType = requestUrl.searchParams.get("type");

  const appUrl = getClientPortalAppUrl();
  const successUrl = `${appUrl}${CLIENT_DASHBOARD_PATH}`;
  const failureUrl = `${appUrl}/client/login?error=auth`;

  console.log("[auth/callback] Incoming request:", {
    hasCode: Boolean(code),
    hasTokenHash: Boolean(tokenHash),
    otpType,
    appUrl,
    successUrl,
  });

  if (!code && !tokenHash) {
    console.warn("[auth/callback] Missing code and token_hash — redirecting to login");
    return NextResponse.redirect(failureUrl);
  }

  const cookieStore = await cookies();
  let response = NextResponse.redirect(successUrl);

  const supabase = createServerClient(getSupabaseUrl(), getSupabaseAnonKey(), {
    cookies: {
      getAll() {
        return cookieStore.getAll();
      },
      setAll(cookiesToSet) {
        cookiesToSet.forEach(({ name, value, options }) => {
          response.cookies.set(name, value, options);
        });
      },
    },
  });

  if (code) {
    const { error } = await supabase.auth.exchangeCodeForSession(code);

    if (error) {
      console.error("[auth/callback] exchangeCodeForSession failed:", error.message);
      return NextResponse.redirect(failureUrl);
    }

    console.log("[auth/callback] Session established via code — redirecting to dashboard");
    return response;
  }

  if (tokenHash && isEmailOtpType(otpType)) {
    const { error } = await supabase.auth.verifyOtp({
      token_hash: tokenHash,
      type: otpType,
    });

    if (error) {
      console.error("[auth/callback] verifyOtp failed:", error.message);
      return NextResponse.redirect(failureUrl);
    }

    console.log("[auth/callback] Session established via token_hash — redirecting to dashboard");
    return response;
  }

  console.warn("[auth/callback] Unrecognized auth params — redirecting to login");
  return NextResponse.redirect(failureUrl);
}
