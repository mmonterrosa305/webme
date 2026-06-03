import type { Client } from "@/lib/clients/types";
import { createAdminClient } from "@/lib/supabase/admin";

import { extractSiteContent } from "./extract-content";
import type { ClientSiteData, SiteMetadata } from "./types";

type LeadSiteRow = {
  id: string;
  business_name: string;
  phone: string | null;
  address: string | null;
  site_slug: string | null;
  site_html: string | null;
  site_metadata: SiteMetadata | null;
};

export async function getClientSiteData(
  client: Client,
): Promise<ClientSiteData | null> {
  const supabase = createAdminClient();

  const { data: lead, error } = await supabase
    .from("leads")
    .select(
      "id, business_name, phone, address, site_slug, site_html, site_metadata",
    )
    .eq("id", client.lead_id)
    .maybeSingle();

  if (error) {
    throw new Error(error.message);
  }

  const leadRow = lead as LeadSiteRow | null;

  if (!leadRow?.site_html || !leadRow.site_slug) {
    return null;
  }

  const metadata = leadRow.site_metadata ?? null;

  return {
    clientId: client.id,
    leadId: leadRow.id,
    siteSlug: leadRow.site_slug,
    siteHtml: leadRow.site_html,
    content: extractSiteContent(leadRow.site_html, {
      businessName: leadRow.business_name,
      phone: leadRow.phone,
      address: leadRow.address,
      metadata,
    }),
    plan: client.package,
    subscriptionStatus: client.subscription_status,
  };
}

export async function publishClientSite(
  client: Client,
  siteHtml: string,
  content: ClientSiteData["content"],
  metadata: SiteMetadata,
): Promise<{ siteSlug: string }> {
  const supabase = createAdminClient();
  const now = new Date().toISOString();

  const { data: lead, error: leadError } = await supabase
    .from("leads")
    .update({
      business_name: content.businessName,
      phone: content.phone || null,
      address: content.address || null,
      site_html: siteHtml,
      site_metadata: metadata,
    })
    .eq("id", client.lead_id)
    .select("site_slug")
    .single();

  if (leadError) {
    throw new Error(leadError.message);
  }

  const { error: clientError } = await supabase
    .from("clients")
    .update({
      business_name: content.businessName,
      phone: content.phone || null,
      site_html: siteHtml,
      site_slug: lead.site_slug,
      site_last_updated: now,
    })
    .eq("id", client.id);

  if (clientError) {
    throw new Error(clientError.message);
  }

  return { siteSlug: lead.site_slug as string };
}
