function escapeHtml(value: string): string {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;");
}

export function buildDomainRequestAdminEmail({
  businessName,
  clientEmail,
  domain,
  pricePerYear,
  plan,
}: {
  businessName: string;
  clientEmail: string;
  domain: string;
  pricePerYear: number;
  plan: string;
}): { subject: string; html: string; text: string } {
  const safeBusiness = escapeHtml(businessName);
  const safeEmail = escapeHtml(clientEmail);
  const safeDomain = escapeHtml(domain);
  const safePlan = escapeHtml(plan);
  const formattedPrice = `$${pricePerYear.toFixed(2)}/yr`;

  const subject = `Domain claim request: ${domain}`;

  const html = `
    <div style="font-family: Arial, Helvetica, sans-serif; max-width: 640px; margin: 0 auto; color: #171717; line-height: 1.6;">
      <p style="margin: 0 0 16px;">A client requested a custom domain.</p>
      <table style="width: 100%; border-collapse: collapse; margin: 0 0 24px;">
        <tr><td style="padding: 8px 0; color: #525252;">Business</td><td style="padding: 8px 0;"><strong>${safeBusiness}</strong></td></tr>
        <tr><td style="padding: 8px 0; color: #525252;">Client email</td><td style="padding: 8px 0;">${safeEmail}</td></tr>
        <tr><td style="padding: 8px 0; color: #525252;">Plan</td><td style="padding: 8px 0;">${safePlan}</td></tr>
        <tr><td style="padding: 8px 0; color: #525252;">Domain</td><td style="padding: 8px 0;"><strong>${safeDomain}</strong></td></tr>
        <tr><td style="padding: 8px 0; color: #525252;">Quoted price</td><td style="padding: 8px 0;">${formattedPrice}</td></tr>
      </table>
      <p style="margin: 0; font-size: 14px; color: #525252;">
        Purchase manually in Cloudflare and update the client record when live.
      </p>
    </div>
  `.trim();

  const text = [
    "A client requested a custom domain.",
    "",
    `Business: ${businessName}`,
    `Client email: ${clientEmail}`,
    `Plan: ${plan}`,
    `Domain: ${domain}`,
    `Quoted price: ${formattedPrice}`,
    "",
    "Purchase manually in Cloudflare and update the client record when live.",
  ].join("\n");

  return { subject, html, text };
}
