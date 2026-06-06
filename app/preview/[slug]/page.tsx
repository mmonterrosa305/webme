import type { Metadata } from "next";
import { notFound } from "next/navigation";

import { getLeadBySlug } from "@/lib/leads/get-lead-by-slug";
import { createAdminClient } from "@/lib/supabase/admin";
import type { LeadPreview } from "@/lib/leads/types";

import { PreviewShell } from "./preview-shell";

type PageProps = {
  params: Promise<{ slug: string }>;
};

export async function generateMetadata({
  params,
}: PageProps): Promise<Metadata> {
  const { slug } = await params;
  const lead = await getLeadBySlug(slug);

  return {
    title: lead
      ? `${lead.business_name} — Site Preview`
      : "Site Preview — WebMe",
  };
}

export default async function PreviewPage({ params }: PageProps) {
  const { slug } = await params;
  const lead = await getLeadBySlug(slug);

  if (!lead) {
    notFound();
  }

  let leadB: LeadPreview | null = null;

  if (!/-b-\d+$/.test(slug)) {
    try {
      const supabase = createAdminClient();
      const { data, error } = await supabase
        .from("leads")
        .select(
          "id, business_name, city, industry, site_slug, site_html, owner_email, status",
        )
        .eq("business_name", lead.business_name)
        .eq("city", lead.city)
        .eq("site_version", "B")
        .order("site_built_at", { ascending: false })
        .limit(1)
        .maybeSingle();

      if (!error && data?.site_html) {
        leadB = data as LeadPreview;
      }
    } catch {
      leadB = null;
    }
  }

  return <PreviewShell lead={lead} leadB={leadB ?? null} />;
}
