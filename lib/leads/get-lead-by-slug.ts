import { createAdminClient } from "@/lib/supabase/admin";

import type { LeadPreview } from "./types";

export async function getLeadBySlug(slug: string): Promise<LeadPreview | null> {
  const supabase = createAdminClient();

  const { data, error } = await supabase
    .from("leads")
    .select(
      "id, business_name, city, industry, site_slug, site_html, site_metadata, owner_email, status, site_version, site_built_at",
    )
    .eq("site_slug", slug)
    .maybeSingle();

  if (error) {
    throw new Error(error.message);
  }

  if (data?.site_html) {
    return data as LeadPreview;
  }

  // Fall back to Create Site projects so previews survive lead cleanup.
  const { data: project, error: projectError } = await supabase
    .from("projects")
    .select(
      "id, business_name, city, industry, site_slug, site_html, site_metadata, site_built_at",
    )
    .eq("site_slug", slug)
    .maybeSingle();

  if (projectError) {
    throw new Error(projectError.message);
  }

  if (!project?.site_html) {
    return null;
  }

  return {
    id: project.id,
    business_name: project.business_name,
    city: project.city,
    industry: project.industry,
    site_slug: project.site_slug,
    site_html: project.site_html,
    site_metadata: project.site_metadata,
    owner_email: null,
    status: "pending_review",
  } as LeadPreview;
}
