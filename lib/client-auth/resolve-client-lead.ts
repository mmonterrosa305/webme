import type { Client } from "@/lib/clients/types";
import { createAdminClient } from "@/lib/supabase/admin";

import type { SiteMetadata } from "@/lib/site-editor/types";

export type ClientLeadRow = {
  id: string;
  business_name: string;
  phone: string | null;
  address: string | null;
  site_slug: string | null;
  site_html: string | null;
  site_metadata: SiteMetadata | null;
  owner_email: string | null;
};

const LEAD_SELECT =
  "id, business_name, phone, address, site_slug, site_html, site_metadata, owner_email";

/** Resolves a lead for a client, avoiding null UUID queries on clients.lead_id. */
export async function resolveClientLead(
  client: Client,
): Promise<ClientLeadRow | null> {
  const supabase = createAdminClient();

  if (client.lead_id) {
    const { data, error } = await supabase
      .from("leads")
      .select(LEAD_SELECT)
      .eq("id", client.lead_id)
      .maybeSingle();

    if (error) {
      throw new Error(error.message);
    }

    if (data) {
      return data as ClientLeadRow;
    }
  }

  const { data: leadByEmail, error: emailLookupError } = await supabase
    .from("leads")
    .select(LEAD_SELECT)
    .ilike("owner_email", client.owner_email)
    .not("site_html", "is", null)
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (emailLookupError) {
    throw new Error(emailLookupError.message);
  }

  const lead = (leadByEmail as ClientLeadRow | null) ?? null;

  if (lead && !client.lead_id) {
    const { error: backfillError } = await supabase
      .from("clients")
      .update({ lead_id: lead.id })
      .eq("id", client.id);

    if (backfillError) {
      console.warn(
        "[client-auth/resolve-client-lead] Failed to backfill lead_id:",
        backfillError.message,
      );
    }
  }

  return lead;
}
