import { CLIENT_MAGIC_LINK_EXPIRY_SECONDS } from "./constants";

let expirySyncAttempted = false;

function getSupabaseProjectRef(): string | null {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL?.trim();

  if (!url) {
    return null;
  }

  if (url.startsWith("http://") || url.startsWith("https://")) {
    const match = url.match(/https?:\/\/([^.]+)\.supabase\.co/);
    return match?.[1] ?? null;
  }

  return url;
}

/**
 * Aligns Supabase project mailer_otp_exp with CLIENT_MAGIC_LINK_EXPIRY_SECONDS when
 * SUPABASE_ACCESS_TOKEN is configured. Link validity is enforced by GoTrue, not per request.
 */
export async function ensureClientMagicLinkExpiry(): Promise<void> {
  if (expirySyncAttempted) {
    return;
  }

  expirySyncAttempted = true;

  const accessToken = process.env.SUPABASE_ACCESS_TOKEN?.trim();
  const projectRef = getSupabaseProjectRef();

  if (!accessToken || !projectRef) {
    console.log(
      "[client-auth/send-otp] OTP expiry:",
      CLIENT_MAGIC_LINK_EXPIRY_SECONDS,
      "seconds — set Supabase Auth → Email → Email OTP Expiration to match",
    );
    return;
  }

  try {
    const response = await fetch(
      `https://api.supabase.com/v1/projects/${projectRef}/config/auth`,
      {
        method: "PATCH",
        headers: {
          Authorization: `Bearer ${accessToken}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          mailer_otp_exp: CLIENT_MAGIC_LINK_EXPIRY_SECONDS,
        }),
      },
    );

    if (!response.ok) {
      const body = await response.text();
      console.warn(
        "[client-auth/send-otp] Could not sync mailer_otp_exp:",
        response.status,
        body,
      );
      return;
    }

    console.log(
      "[client-auth/send-otp] Synced Supabase mailer_otp_exp to",
      CLIENT_MAGIC_LINK_EXPIRY_SECONDS,
      "seconds",
    );
  } catch (error) {
    console.warn(
      "[client-auth/send-otp] Failed to sync mailer_otp_exp:",
      error instanceof Error ? error.message : error,
    );
  }
}
