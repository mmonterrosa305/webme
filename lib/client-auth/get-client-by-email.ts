import type { Client } from "@/lib/clients/types";
import { createAdminClient } from "@/lib/supabase/admin";

export async function getClientByEmail(
  email: string,
): Promise<Client | null> {
  const normalizedEmail = email.trim().toLowerCase();

  console.log("[client-auth/get-client-by-email] Lookup owner_email:", normalizedEmail);

  if (!normalizedEmail) {
    console.log("[client-auth/get-client-by-email] Empty email — returning null");
    return null;
  }

  const supabase = createAdminClient();

  const { data, error } = await supabase
    .from("clients")
    .select(
      "id, lead_id, business_name, package, owner_email, stripe_customer_id, stripe_subscription_id, subscription_status, one_time_amount, monthly_amount, created_at",
    )
    .ilike("owner_email", normalizedEmail)
    .maybeSingle();

  if (error) {
    console.error("[client-auth/get-client-by-email] Supabase error:", error.message);
    throw new Error(error.message);
  }

  if (!data) {
    console.log(
      "[client-auth/get-client-by-email] No row in clients for owner_email:",
      normalizedEmail,
    );
    return null;
  }

  console.log("[client-auth/get-client-by-email] Match found:", {
    id: data.id,
    owner_email: data.owner_email,
    package: data.package,
  });

  return (data as Client | null) ?? null;
}
