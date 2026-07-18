import type { SiteMetadata } from "@/lib/site-editor/types";

export type Project = {
  id: string;
  business_name: string;
  city: string;
  industry: string | null;
  site_slug: string;
  site_built_at: string;
  created_at: string;
  site_html?: string;
  site_metadata?: SiteMetadata | null;
};

export type ProjectListItem = Omit<Project, "site_html" | "site_metadata">;
