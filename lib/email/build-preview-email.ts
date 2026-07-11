import { getOutreachPreviewBaseUrl } from "@/lib/outreach/build-cold-email";

function escapeHtml(value: string): string {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;");
}

export function buildPreviewSiteUrl(siteSlug: string): string {
  return `${getOutreachPreviewBaseUrl()}/${siteSlug}?mode=public`;
}

export function buildPreviewEmail({
  businessName,
  previewUrl,
}: {
  businessName: string;
  previewUrl: string;
}): { subject: string; html: string; text: string } {
  const subject = `We built something for you, ${businessName}`;
  const safeBusiness = escapeHtml(businessName);
  const safePreviewUrl = escapeHtml(previewUrl);

  const html = `
    <div style="font-family: Arial, Helvetica, sans-serif; max-width: 640px; margin: 0 auto; color: #171717; line-height: 1.6;">
      <p style="margin: 0 0 32px;">
        We put together a preview website for <strong>${safeBusiness}</strong> — take a look when you have a minute.
      </p>
      <p style="margin: 0; text-align: center;">
        <a href="${safePreviewUrl}" style="display: inline-block; background: #171717; color: #ffffff; font-size: 18px; font-weight: 700; text-decoration: none; padding: 16px 32px; border-radius: 8px;">
          See Your Website &rarr;
        </a>
      </p>
    </div>
  `.trim();

  const text = `We put together a preview website for ${businessName} — take a look when you have a minute.

See your website: ${previewUrl}`;

  return { subject, html, text };
}
