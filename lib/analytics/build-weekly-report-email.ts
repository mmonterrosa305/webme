function escapeHtml(value: string): string {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;");
}

export function buildWeeklyReportEmail({
  businessName,
  pageViews,
  formSubmits,
  siteUrl,
}: {
  businessName: string;
  pageViews: number;
  formSubmits: number;
  siteUrl: string | null;
}): { subject: string; html: string; text: string } {
  const subject = `Your Weekly Website Report — ${businessName}`;
  const safeBusiness = escapeHtml(businessName);
  const safeSiteUrl = siteUrl ? escapeHtml(siteUrl) : null;

  const html = `
    <div style="font-family: Arial, Helvetica, sans-serif; max-width: 640px; margin: 0 auto; color: #171717; line-height: 1.6;">
      <p style="margin: 0 0 8px; font-size: 12px; text-transform: uppercase; letter-spacing: 0.05em; color: #737373;">
        Weekly report
      </p>
      <h1 style="margin: 0 0 24px; font-size: 24px; font-weight: 700; color: #171717;">
        ${safeBusiness}
      </h1>
      <p style="margin: 0 0 24px;">
        Here is how your website performed over the last 7 days.
      </p>
      <table style="width: 100%; border-collapse: collapse; margin: 0 0 24px;">
        <tr>
          <td style="padding: 16px; border: 1px solid #e5e5e5; border-radius: 8px 0 0 8px; background: #fafafa;">
            <p style="margin: 0 0 4px; font-size: 12px; color: #737373;">Page views</p>
            <p style="margin: 0; font-size: 28px; font-weight: 700; color: #171717;">${pageViews}</p>
          </td>
          <td style="padding: 16px; border: 1px solid #e5e5e5; border-left: none; border-radius: 0 8px 8px 0; background: #fafafa;">
            <p style="margin: 0 0 4px; font-size: 12px; color: #737373;">Form submissions</p>
            <p style="margin: 0; font-size: 28px; font-weight: 700; color: #171717;">${formSubmits}</p>
          </td>
        </tr>
      </table>
      <p style="margin: 0 0 16px;">
        Your site is live and collecting visitors. Keep sharing your link to grow your reach.
      </p>
      ${
        safeSiteUrl
          ? `<p style="margin: 0 0 24px;">
        <a href="${safeSiteUrl}" style="color: #171717; font-weight: 600;">View your live site</a>
      </p>`
          : ""
      }
      <p style="margin: 0; color: #737373; font-size: 14px;">
        — MyWebMe
      </p>
    </div>
  `.trim();

  const text = `Your Weekly Website Report — ${businessName}

Page views (7 days): ${pageViews}
Form submissions (7 days): ${formSubmits}

Your site is live and collecting visitors. Keep sharing your link to grow your reach.
${siteUrl ? `\nView your live site: ${siteUrl}` : ""}

— MyWebMe`;

  return { subject, html, text };
}
