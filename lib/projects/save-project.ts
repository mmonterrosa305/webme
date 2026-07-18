import type { SiteMetadata } from "@/lib/site-editor/types";
import { createAdminClient } from "@/lib/supabase/admin";

export type SaveProjectInput = {
  businessName: string;
  city: string;
  industry: string | null;
  siteHtml: string;
  siteSlug: string;
  siteBuiltAt: string;
  siteMetadata?: SiteMetadata | null;
};

export async function saveProject(input: SaveProjectInput): Promise<void> {
  const supabase = createAdminClient();

  const { error } = await supabase.from("projects").upsert(
    {
      business_name: input.businessName,
      city: input.city,
      industry: input.industry,
      site_html: input.siteHtml,
      site_slug: input.siteSlug,
      site_built_at: input.siteBuiltAt,
      site_metadata: input.siteMetadata ?? null,
    },
    { onConflict: "site_slug" },
  );

  if (error) {
    throw new Error(error.message);
  }
}

export async function syncProjectSiteBySlug(input: {
  siteSlug: string;
  siteHtml: string;
  siteBuiltAt: string;
  siteMetadata?: SiteMetadata | null;
  industry?: string | null;
}): Promise<void> {
  const supabase = createAdminClient();

  const updates: Record<string, unknown> = {
    site_html: input.siteHtml,
    site_built_at: input.siteBuiltAt,
  };

  if (input.siteMetadata !== undefined) {
    updates.site_metadata = input.siteMetadata;
  }

  if (input.industry !== undefined) {
    updates.industry = input.industry;
  }

  const { error } = await supabase
    .from("projects")
    .update(updates)
    .eq("site_slug", input.siteSlug);

  if (error) {
    console.error(
      `[projects] Failed to sync project for ${input.siteSlug}:`,
      error.message,
    );
  }
}
