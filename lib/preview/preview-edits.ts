import { applySiteContent } from "@/lib/site-editor/apply-content";
import {
  contentToMetadata,
  extractSiteContent,
  normalizeLogoUrl,
} from "@/lib/site-editor/extract-content";
import type { SiteContent, SiteMetadata } from "@/lib/site-editor/types";
import { createAdminClient } from "@/lib/supabase/admin";

export type PreviewEditableFields = {
  businessName: string;
  phone: string;
  tagline: string;
  logoUrl: string;
};

export type LeadEditRecord = {
  id: string;
  business_name: string;
  phone: string | null;
  site_slug: string;
  site_html: string;
  site_metadata: Record<string, unknown> | null;
  preview_edits_used: number;
};

export async function getLeadForPreviewEdit(
  slug: string,
): Promise<LeadEditRecord | null> {
  const supabase = createAdminClient();

  let data: LeadEditRecord | null = null;
  let errorMessage: string | null = null;

  const fullSelect = await supabase
    .from("leads")
    .select(
      "id, business_name, phone, site_slug, site_html, site_metadata, preview_edits_used",
    )
    .eq("site_slug", slug)
    .maybeSingle();

  if (fullSelect.error) {
    errorMessage = fullSelect.error.message;
    const fallbackSelect = await supabase
      .from("leads")
      .select("id, business_name, phone, site_slug, site_html, site_metadata")
      .eq("site_slug", slug)
      .maybeSingle();

    if (fallbackSelect.error) {
      throw new Error(fallbackSelect.error.message);
    }

    if (fallbackSelect.data?.site_html) {
      data = {
        ...(fallbackSelect.data as Omit<LeadEditRecord, "preview_edits_used">),
        preview_edits_used: 0,
      };
    }
  } else if (fullSelect.data?.site_html) {
    data = fullSelect.data as LeadEditRecord;
  } else if (errorMessage) {
    throw new Error(errorMessage);
  }

  return data;
}

export function extractPreviewFields(
  lead: LeadEditRecord,
): PreviewEditableFields {
  const content = extractSiteContent(lead.site_html, {
    businessName: lead.business_name,
    phone: lead.phone ?? "",
    address: "",
    metadata: (lead.site_metadata as SiteMetadata | null) ?? null,
  });

  return {
    businessName: content.businessName,
    phone: content.phone,
    tagline: content.tagline,
    logoUrl: normalizeLogoUrl(content.logoUrl),
  };
}

export async function applyPreviewEdit(
  lead: LeadEditRecord,
  fields: PreviewEditableFields,
): Promise<{ html: string; fields: PreviewEditableFields }> {
  const existingContent = extractSiteContent(lead.site_html, {
    businessName: lead.business_name,
    phone: lead.phone ?? "",
    address: "",
    metadata: (lead.site_metadata as SiteMetadata | null) ?? null,
  });

  const nextContent: SiteContent = {
    ...existingContent,
    businessName: fields.businessName.trim(),
    phone: fields.phone.trim(),
    tagline: fields.tagline.trim(),
  };

  const updatedHtml = applySiteContent(
    lead.site_html,
    existingContent,
    nextContent,
  );

  const metadata = contentToMetadata(nextContent);
  const supabase = createAdminClient();

  const { error } = await supabase
    .from("leads")
    .update({
      business_name: nextContent.businessName,
      phone: nextContent.phone || null,
      site_html: updatedHtml,
      site_metadata: metadata,
      preview_edits_used: lead.preview_edits_used + 1,
    })
    .eq("id", lead.id);

  if (error) {
    throw new Error(error.message);
  }

  return {
    html: updatedHtml,
    fields: {
      businessName: nextContent.businessName,
      phone: nextContent.phone,
      tagline: nextContent.tagline,
      logoUrl: nextContent.logoUrl,
    },
  };
}
