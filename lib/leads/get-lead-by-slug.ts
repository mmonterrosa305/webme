import { createAdminClient } from "@/lib/supabase/admin";

import type { LeadPreview } from "./types";

export async function getLeadBySlug(slug: string): Promise<LeadPreview | null> {
  const supabase = createAdminClient();

  const { data, error } = await supabase
    .from("leads")
    .select(
      "id, business_name, city, industry, site_slug, site_html, owner_email, status, site_version, site_built_at",
    )
    .eq("site_slug", slug)
    .maybeSingle();

  if (error) {
    throw new Error(error.message);
  }

  if (!data?.site_html) {
    return null;
  }

  return data as LeadPreview;
}
