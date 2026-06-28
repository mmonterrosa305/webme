function escapeHtml(value: string): string {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;");
}

export function buildCheckoutWelcomeEmail({
  businessName,
  portalUrl,
  previewUrl,
}: {
  businessName: string;
  portalUrl: string;
  previewUrl: string;
}): { subject: string; html: string; text: string } {
  const safeBusiness = escapeHtml(businessName);
  const safePortal = escapeHtml(portalUrl);
  const safePreview = escapeHtml(previewUrl);
  const subject = `Welcome to MyWebMe — ${businessName} is on the way`;

  const html = `
    <div style="font-family: Arial, Helvetica, sans-serif; max-width: 640px; margin: 0 auto; color: #171717; line-height: 1.6;">
      <p style="margin: 0 0 16px;">Hi there,</p>
      <p style="margin: 0 0 16px;">
        Thank you for choosing MyWebMe! Your payment is confirmed and
        <strong>${safeBusiness}</strong> will be live within 24 hours.
      </p>
      <p style="margin: 0 0 24px;">
        We sent a separate email with your 6-digit sign-in code. Use it at the client portal to edit your site anytime.
      </p>
      <p style="margin: 0 0 32px; text-align: center;">
        <a href="${safePortal}" style="display: inline-block; background: #171717; color: #ffffff; font-size: 16px; font-weight: 700; text-decoration: none; padding: 14px 28px; border-radius: 8px; margin-right: 8px;">
          Open client portal
        </a>
        <a href="${safePreview}" style="display: inline-block; background: #ffffff; color: #171717; font-size: 16px; font-weight: 700; text-decoration: none; padding: 12px 26px; border-radius: 8px; border: 2px solid #171717;">
          Preview your site
        </a>
      </p>
      <p style="margin: 0; font-size: 14px; color: #737373;">
        Questions? Reply to this email or write to sites@mywebme.com.
      </p>
    </div>
  `.trim();

  const text = `Welcome to MyWebMe!

Thank you for choosing MyWebMe. Your payment is confirmed and ${businessName} will be live within 24 hours.

We also sent a 6-digit sign-in code in a separate email. Use it here to access your client portal:
${portalUrl}

Preview your site: ${previewUrl}

Questions? Email sites@mywebme.com.`;

  return { subject, html, text };
}
