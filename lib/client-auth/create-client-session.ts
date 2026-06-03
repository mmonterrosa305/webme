import { createServerClient } from "@supabase/auth-helpers-nextjs";
import { cookies } from "next/headers";
import { NextResponse } from "next/server";

import { CLIENT_DASHBOARD_PATH, getClientPortalAppUrl } from "./app-url";
import { ensureClientAuthUser } from "./ensure-client-auth-user";
import { getSupabaseAnonKey, getSupabaseUrl } from "@/lib/supabase/env";
import { createAdminClient } from "@/lib/supabase/admin";

export async function createClientPortalSession(
  email: string,
  businessName: string,
): Promise<NextResponse> {
  const normalizedEmail = email.trim().toLowerCase();
  const appUrl = getClientPortalAppUrl();
  const successUrl = `${appUrl}${CLIENT_DASHBOARD_PATH}`;

  await ensureClientAuthUser(normalizedEmail, businessName);

  const admin = createAdminClient();
  const { data: linkData, error: linkError } =
    await admin.auth.admin.generateLink({
      type: "magiclink",
      email: normalizedEmail,
      options: {
        data: {
          app_role: "client",
          business_name: businessName,
        },
      },
    });

  if (linkError) {
    throw new Error(`Failed to create session: ${linkError.message}`);
  }

  const tokenHash = linkData.properties?.hashed_token;

  if (!tokenHash) {
    throw new Error("Failed to create session: missing auth token.");
  }

  const cookieStore = await cookies();
  let response = NextResponse.json({ success: true, redirectTo: successUrl });

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

  const { error: verifyError } = await supabase.auth.verifyOtp({
    token_hash: tokenHash,
    type: "magiclink",
  });

  if (verifyError) {
    throw new Error(`Failed to create session: ${verifyError.message}`);
  }

  return response;
}
