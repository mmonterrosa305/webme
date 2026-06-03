/** Base URL for client portal auth redirects (magic links, callbacks). */
export function getClientPortalAppUrl(): string {
  const configured =
    process.env.APP_URL?.trim() ||
    process.env.NEXT_PUBLIC_APP_URL?.trim() ||
    (process.env.NODE_ENV === "production"
      ? "https://mywebme.com"
      : "http://localhost:3000");

  return configured.replace(/\/$/, "");
}

/** Supabase redirect URL — must be allowlisted in Supabase Auth settings. */
export function getClientAuthCallbackUrl(): string {
  return `${getClientPortalAppUrl()}/auth/callback`;
}

export const CLIENT_DASHBOARD_PATH = "/client/dashboard";

/** Required Supabase Auth → URL Configuration → Redirect URLs entry. */
export const SUPABASE_CLIENT_AUTH_REDIRECT_URL =
  "https://mywebme.com/auth/callback";
