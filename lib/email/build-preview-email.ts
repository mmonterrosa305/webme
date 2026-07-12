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
  const subject = `We built ${businessName} a website — take a look`;
  const safePreviewUrl = escapeHtml(previewUrl);

  const html = `
    <div style="font-family: Arial, Helvetica, sans-serif; max-width: 640px; margin: 0 auto; color: #171717; line-height: 1.6;">
      <p style="margin: 0 0 16px;">
        Most web agencies charge thousands of dollars and weeks of back-and-forth for a website. We already built yours — for free, no strings attached.
      </p>
      <p style="margin: 0 0 16px;">
        Take a look below. If you like it, it&apos;s yours for a fraction of what you&apos;d pay anywhere else.
      </p>
      <p style="margin: 0 0 32px;">
        Every business deserves a great website. Yours is ready.
      </p>
      <p style="margin: 0; text-align: center;">
        <a href="${safePreviewUrl}" style="display: inline-block; background: #171717; color: #ffffff; font-size: 18px; font-weight: 700; text-decoration: none; padding: 16px 32px; border-radius: 8px;">
          See Your Website &rarr;
        </a>
      </p>
    </div>
  `.trim();

  const text = `Most web agencies charge thousands of dollars and weeks of back-and-forth for a website. We already built yours — for free, no strings attached.

Take a look below. If you like it, it's yours for a fraction of what you'd pay anywhere else.

Every business deserves a great website. Yours is ready.

See your website: ${previewUrl}`;

  return { subject, html, text };
}
