import { createAdminClient } from "@/lib/supabase/admin";

function isExistingUserError(message: string): boolean {
  const lower = message.toLowerCase();
  return (
    lower.includes("already") ||
    lower.includes("registered") ||
    lower.includes("exists")
  );
}

/** Ensures a Supabase Auth user exists before signInWithOtp with shouldCreateUser: false. */
export async function ensureClientAuthUser(
  email: string,
  businessName: string,
): Promise<void> {
  const normalizedEmail = email.trim().toLowerCase();
  const supabase = createAdminClient();

  const { error } = await supabase.auth.admin.createUser({
    email: normalizedEmail,
    email_confirm: true,
    user_metadata: {
      app_role: "client",
      business_name: businessName,
    },
  });

  if (!error) {
    console.log("[client-auth/ensure-user] Created auth user:", normalizedEmail);
    return;
  }

  if (isExistingUserError(error.message)) {
    console.log("[client-auth/ensure-user] Auth user already exists:", normalizedEmail);
    return;
  }

  throw new Error(`Failed to prepare client account: ${error.message}`);
}
