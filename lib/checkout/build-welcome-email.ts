function escapeHtml(value: string): string {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;");
}

const CLIENT_PORTAL_LOGIN_URL = "https://webme-x6ed.onrender.com/client/login";

export function buildCheckoutWelcomeEmail({
  businessName,
  siteUrl,
}: {
  businessName: string;
  siteUrl: string;
}): { subject: string; html: string; text: string } {
  const safeBusiness = escapeHtml(businessName);
  const safeSiteUrl = escapeHtml(siteUrl);
  const subject = `Your website is ready, ${businessName}! 🎉`;

  const html = `
    <div style="font-family: Arial, Helvetica, sans-serif; max-width: 640px; margin: 0 auto; color: #171717; line-height: 1.6;">
      <p style="margin: 0 0 16px;">Hi there,</p>
      <p style="margin: 0 0 24px;">
        Thank you for choosing MyWebMe! Your website for
        <strong>${safeBusiness}</strong> is ready.
      </p>
      <p style="margin: 0 0 28px; text-align: center;">
        <a href="${safeSiteUrl}" style="display: inline-block; background: #22c55e; color: #ffffff; font-size: 16px; font-weight: 700; text-decoration: none; padding: 14px 28px; border-radius: 8px;">
          View Your Site
        </a>
      </p>
      <p style="margin: 0 0 16px;">
        You can also log in to your client portal to track your site status and manage your account.
      </p>
      <p style="margin: 0 0 28px; text-align: center;">
        <a href="${CLIENT_PORTAL_LOGIN_URL}" style="display: inline-block; background: #0f172a; color: #ffffff; font-size: 16px; font-weight: 700; text-decoration: none; padding: 14px 28px; border-radius: 8px;">
          Access Your Client Portal
        </a>
      </p>
      <p style="margin: 0 0 16px;">
        Next step: reply to this email with your domain name (e.g. yourbusiness.com) and we&apos;ll get it connected for you.
      </p>
      <p style="margin: 0 0 24px;">
        Questions? Just reply to this email.
      </p>
      <p style="margin: 0;">
        — The MyWebMe Team
      </p>
    </div>
  `.trim();

  const text = `Hi there,

Thank you for choosing MyWebMe! Your website for ${businessName} is ready.

View your site: ${siteUrl}

You can also log in to your client portal to track your site status and manage your account.
Access your client portal: ${CLIENT_PORTAL_LOGIN_URL}

Next step: reply to this email with your domain name (e.g. yourbusiness.com) and we'll get it connected for you.

Questions? Just reply to this email.

— The MyWebMe Team`;

  return { subject, html, text };
}
