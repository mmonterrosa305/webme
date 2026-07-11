function escapeHtml(value: string): string {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;");
}

export function buildDomainConnectedEmail({
  businessName,
  domain,
  previewUrl,
  portalUrl,
}: {
  businessName: string;
  domain: string;
  previewUrl: string;
  portalUrl: string;
}): { subject: string; html: string; text: string } {
  const safeBusiness = escapeHtml(businessName);
  const safeDomain = escapeHtml(domain);
  const safePreview = escapeHtml(previewUrl);
  const safePortal = escapeHtml(portalUrl);
  const subject = `We're connecting ${domain} to your site`;

  const html = `
    <div style="font-family: Arial, Helvetica, sans-serif; max-width: 640px; margin: 0 auto; color: #171717; line-height: 1.6;">
      <p style="margin: 0 0 16px;">Hi there,</p>
      <p style="margin: 0 0 16px;">
        Thanks for updating your DNS for <strong>${safeDomain}</strong>.
        We're finishing the connection for <strong>${safeBusiness}</strong>.
      </p>
      <p style="margin: 0 0 16px;">
        DNS changes can take up to 24–48 hours to propagate worldwide. Once
        everything is live, visitors will reach your site at
        <strong>https://${safeDomain}</strong>.
      </p>
      <p style="margin: 0 0 32px; text-align: center;">
        <a href="${safePreview}" style="display: inline-block; background: #171717; color: #ffffff; font-size: 16px; font-weight: 700; text-decoration: none; padding: 14px 28px; border-radius: 8px; margin-right: 8px;">
          Preview your site
        </a>
        <a href="${safePortal}" style="display: inline-block; background: #ffffff; color: #171717; font-size: 16px; font-weight: 700; text-decoration: none; padding: 12px 26px; border-radius: 8px; border: 2px solid #171717;">
          Client portal
        </a>
      </p>
      <p style="margin: 0; font-size: 14px; color: #737373;">
        Questions? Reply to this email or write to sites@mywebme.com.
      </p>
    </div>
  `.trim();

  const text = `Thanks for updating your DNS for ${domain}.

We're finishing the connection for ${businessName}. DNS can take up to 24–48 hours to propagate. Once live, visitors will reach https://${domain}.

Preview: ${previewUrl}
Client portal: ${portalUrl}

Questions? Email sites@mywebme.com.`;

  return { subject, html, text };
}
