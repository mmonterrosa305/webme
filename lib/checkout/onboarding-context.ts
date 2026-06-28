import { getClientBySiteSlug } from "@/lib/clients/get-client-by-site-slug";
import { getClientPortalAppUrl } from "@/lib/client-auth/app-url";
import { createAdminClient } from "@/lib/supabase/admin";

export type CheckoutOnboardingContext = {
  businessName: string;
  siteSlug: string;
  previewUrl: string;
  portalUrl: string;
  ownerEmail: string | null;
  isPaid: boolean;
  domainRequested: string | null;
  domainStatus: string | null;
};

async function getLeadSummaryBySlug(siteSlug: string) {
  const supabase = createAdminClient();

  const { data, error } = await supabase
    .from("leads")
    .select("business_name, owner_email, status, site_slug")
    .eq("site_slug", siteSlug)
    .maybeSingle();

  if (error) {
    throw new Error(error.message);
  }

  return data;
}

export async function getCheckoutOnboardingContext(
  siteSlug: string,
): Promise<CheckoutOnboardingContext | null> {
  const slug = siteSlug.trim();

  if (!slug) {
    return null;
  }

  const [lead, client] = await Promise.all([
    getLeadSummaryBySlug(slug),
    getClientBySiteSlug(slug),
  ]);

  if (!lead && !client) {
    return null;
  }

  const appUrl = getClientPortalAppUrl();
  const businessName =
    client?.business_name ?? lead?.business_name ?? "Your business";
  const isPaid = lead?.status === "won" || Boolean(client);

  return {
    businessName,
    siteSlug: slug,
    previewUrl: `${appUrl}/preview/${slug}`,
    portalUrl: `${appUrl}/client/login`,
    ownerEmail: client?.owner_email ?? lead?.owner_email ?? null,
    isPaid,
    domainRequested: client?.domain_requested ?? null,
    domainStatus: client?.domain_status ?? null,
  };
}
