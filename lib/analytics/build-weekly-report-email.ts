import type { WeeklyIndustryContent } from "./generate-weekly-industry-content";

function escapeHtml(value: string): string {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;");
}

function formatIndustryLabel(industry: string): string {
  const trimmed = industry.trim();

  if (!trimmed) {
    return "Business";
  }

  return trimmed
    .split(/\s+/)
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
    .join(" ");
}

export function buildWeeklyReportEmail({
  businessName,
  industry,
  pageViews,
  formSubmits,
  content,
}: {
  businessName: string;
  industry: string;
  pageViews: number;
  formSubmits: number;
  content: WeeklyIndustryContent;
}): { subject: string; html: string; text: string } {
  const industryLabel = formatIndustryLabel(industry);
  const subject = `${industryLabel} Weekly — ${businessName}`;
  const safeBusiness = escapeHtml(businessName);
  const safeIndustry = escapeHtml(industryLabel);
  const safeNewsHeadline = escapeHtml(content.news_headline);
  const safeNewsBody = escapeHtml(content.news_body);
  const safeTipHeadline = escapeHtml(content.tip_headline);
  const safeTipBody = escapeHtml(content.tip_body);

  const html = `
<!DOCTYPE html>
<html lang="en">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500&family=Playfair+Display:wght@700&display=swap" rel="stylesheet" />
  </head>
  <body style="margin: 0; padding: 0; background: #f8fafc;">
    <div style="max-width: 640px; margin: 0 auto; background: #ffffff; font-family: Inter, Arial, Helvetica, sans-serif; color: #0f172a; line-height: 1.6;">
      <div style="background: #0f172a; padding: 32px 28px;">
        <p style="margin: 0 0 8px; font-family: 'Playfair Display', Georgia, serif; font-size: 28px; font-weight: 700; color: #ffffff; line-height: 1.2;">
          ${safeIndustry} Weekly
        </p>
        <p style="margin: 0; font-family: Inter, Arial, Helvetica, sans-serif; font-size: 15px; font-weight: 500; color: #cbd5e1;">
          ${safeBusiness}
        </p>
      </div>

      <div style="padding: 28px;">
        <p style="margin: 0 0 20px; font-size: 15px; font-weight: 500; color: #475569;">
          Your website performance over the last 7 days
        </p>

        <table style="width: 100%; border-collapse: separate; border-spacing: 12px 0; margin: 0 0 28px;">
          <tr>
            <td style="width: 50%; padding: 18px; border-radius: 12px; background: #eff6ff; border: 1px solid #dbeafe;">
              <p style="margin: 0 0 6px; font-size: 12px; font-weight: 500; letter-spacing: 0.04em; text-transform: uppercase; color: #2563eb;">
                Page Views
              </p>
              <p style="margin: 0; font-family: 'Playfair Display', Georgia, serif; font-size: 32px; font-weight: 700; color: #1d4ed8;">
                ${pageViews}
              </p>
            </td>
            <td style="width: 50%; padding: 18px; border-radius: 12px; background: #ecfdf5; border: 1px solid #bbf7d0;">
              <p style="margin: 0 0 6px; font-size: 12px; font-weight: 500; letter-spacing: 0.04em; text-transform: uppercase; color: #059669;">
                Form Submissions
              </p>
              <p style="margin: 0; font-family: 'Playfair Display', Georgia, serif; font-size: 32px; font-weight: 700; color: #047857;">
                ${formSubmits}
              </p>
            </td>
          </tr>
        </table>

        <div style="margin: 0 0 24px; padding: 20px 20px 20px 24px; border-left: 4px solid #2563eb; background: #ffffff;">
          <p style="margin: 0 0 8px; font-family: 'Playfair Display', Georgia, serif; font-size: 20px; font-weight: 700; color: #0f172a;">
            Industry News
          </p>
          <p style="margin: 0 0 10px; font-size: 16px; font-weight: 500; color: #1e293b;">
            ${safeNewsHeadline}
          </p>
          <p style="margin: 0; font-size: 15px; font-weight: 400; color: #475569;">
            ${safeNewsBody}
          </p>
        </div>

        <div style="margin: 0 0 28px; padding: 20px; border-radius: 12px; background: #fffbeb; border: 1px solid #fde68a;">
          <p style="margin: 0 0 8px; font-family: 'Playfair Display', Georgia, serif; font-size: 20px; font-weight: 700; color: #92400e;">
            ${safeTipHeadline}
          </p>
          <p style="margin: 0; font-size: 15px; font-weight: 400; color: #78350f;">
            ${safeTipBody}
          </p>
        </div>

        <div style="text-align: center; margin: 0 0 28px;">
          <a
            href="https://mywebme.com/client/login"
            style="display: inline-block; padding: 14px 28px; border-radius: 9999px; background: #0f172a; color: #ffffff; font-size: 15px; font-weight: 500; text-decoration: none;"
          >
            View your dashboard
          </a>
        </div>

        <p style="margin: 0; text-align: center; font-size: 13px; font-weight: 400; color: #94a3b8;">
          Sent every Monday to Elite members
        </p>
      </div>
    </div>
  </body>
</html>
  `.trim();

  const text = `${industryLabel} Weekly — ${businessName}

Page Views (7 days): ${pageViews}
Form Submissions (7 days): ${formSubmits}

Industry News
${content.news_headline}
${content.news_body}

${content.tip_headline}
${content.tip_body}

View your dashboard: https://mywebme.com/client/login

Sent every Monday to Elite members`;

  return { subject, html, text };
}
