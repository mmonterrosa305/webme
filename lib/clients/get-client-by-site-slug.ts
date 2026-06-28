import type { Client } from "@/lib/clients/types";
import { createAdminClient } from "@/lib/supabase/admin";

export async function getClientBySiteSlug(
  siteSlug: string,
): Promise<Client | null> {
  const slug = siteSlug.trim();

  if (!slug) {
    return null;
  }

  const supabase = createAdminClient();

  const { data, error } = await supabase
    .from("clients")
    .select(
      "id, lead_id, business_name, package, owner_email, stripe_customer_id, stripe_subscription_id, subscription_status, one_time_amount, monthly_amount, created_at, site_url, domain_requested, domain_status",
    )
    .eq("site_slug", slug)
    .maybeSingle();

  if (error) {
    throw new Error(error.message);
  }

  return (data as Client | null) ?? null;
}
