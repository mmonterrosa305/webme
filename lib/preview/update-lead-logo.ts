import { removeBackground } from "@/lib/agents/remove-bg";
import { uploadLogo } from "@/lib/agents/upload-logo";
import { applySiteContent } from "@/lib/site-editor/apply-content";
import {
  contentToMetadata,
  extractSiteContent,
} from "@/lib/site-editor/extract-content";
import type { SiteMetadata } from "@/lib/site-editor/types";
import { createAdminClient } from "@/lib/supabase/admin";

const VALID_LOGO_MEDIA_TYPES = new Set([
  "image/png",
  "image/jpeg",
  "image/webp",
  "image/gif",
]);

type LeadLogoRecord = {
  id: string;
  business_name: string;
  phone: string | null;
  address: string | null;
  site_slug: string;
  site_html: string;
  site_metadata: Record<string, unknown> | null;
};

export async function getLeadForLogoUpdate(
  siteSlug: string,
): Promise<LeadLogoRecord | null> {
  const supabase = createAdminClient();

  const { data, error } = await supabase
    .from("leads")
    .select(
      "id, business_name, phone, address, site_slug, site_html, site_metadata",
    )
    .eq("site_slug", siteSlug)
    .maybeSingle();

  if (error) {
    throw new Error(error.message);
  }

  if (!data?.site_html) {
    return null;
  }

  return data as LeadLogoRecord;
}

export async function updateLeadLogoFromUpload({
  siteSlug,
  base64,
  mediaType,
}: {
  siteSlug: string;
  base64: string;
  mediaType: string;
}): Promise<{ html: string; logoUrl: string }> {
  if (!VALID_LOGO_MEDIA_TYPES.has(mediaType)) {
    throw new Error("Only PNG, JPG, WebP, or GIF logos are supported.");
  }

  const lead = await getLeadForLogoUpdate(siteSlug);

  if (!lead) {
    throw new Error("Lead not found.");
  }

  let processedBase64 = base64;
  let processedMediaType = mediaType;

  const noBg = await removeBackground(processedBase64, processedMediaType);
  if (noBg) {
    processedBase64 = noBg.base64;
    processedMediaType = noBg.mediaType;
  }

  const logoUrl = await uploadLogo(
    processedBase64,
    processedMediaType,
    lead.business_name,
  );

  if (!logoUrl) {
    throw new Error("Failed to upload logo.");
  }

  const existingContent = extractSiteContent(lead.site_html, {
    businessName: lead.business_name,
    phone: lead.phone ?? "",
    address: lead.address ?? "",
    metadata: (lead.site_metadata as SiteMetadata | null) ?? null,
  });

  const nextContent = {
    ...existingContent,
    logoUrl,
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
      site_html: updatedHtml,
      site_metadata: metadata,
    })
    .eq("id", lead.id);

  if (error) {
    throw new Error(error.message);
  }

  return {
    html: updatedHtml,
    logoUrl,
  };
}
