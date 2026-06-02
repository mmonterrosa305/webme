import type { Client } from "@/lib/clients/types";
import { createAdminClient } from "@/lib/supabase/admin";

export async function getClients(): Promise<Client[]> {
  const supabase = createAdminClient();

  const { data, error } = await supabase
    .from("clients")
    .select(
      "id, lead_id, business_name, package, owner_email, stripe_customer_id, stripe_subscription_id, subscription_status, one_time_amount, monthly_amount, created_at",
    )
    .order("created_at", { ascending: false });

  if (error) {
    throw new Error(error.message);
  }

  return (data ?? []) as Client[];
}
