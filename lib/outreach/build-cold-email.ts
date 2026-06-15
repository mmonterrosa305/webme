function escapeHtml(value: string): string {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;");
}

export function getOutreachSenderName(): string {
  return process.env.OUTREACH_SENDER_NAME?.trim() || "Maynor";
}

export function getOutreachPreviewBaseUrl(): string {
  const configured = process.env.OUTREACH_PREVIEW_BASE_URL?.trim();

  if (configured) {
    return configured.replace(/\/$/, "");
  }

  return "https://webme-x6ed.onrender.com/preview";
}

export function buildColdOutreachEmail({
  businessName,
  ownerName,
  previewUrl,
  senderName = getOutreachSenderName(),
  trackingPixelUrl,
}: {
  businessName: string;
  ownerName: string | null;
  previewUrl: string;
  senderName?: string;
  trackingPixelUrl?: string;
}): { subject: string; html: string; text: string } {
  const greeting = ownerName?.trim() ? `Hi ${ownerName.trim()},` : "Hi there,";
  const subject = "I built your business a website — take a look";
  const safeBusiness = escapeHtml(businessName);
  const safePreviewUrl = escapeHtml(previewUrl);
  const safeSender = escapeHtml(senderName);
  const trackingPixel = trackingPixelUrl
    ? `<img src="${escapeHtml(trackingPixelUrl)}" width="1" height="1" alt="" style="display:none;width:1px;height:1px;border:0;" />`
    : "";

  const html = `
    <div style="font-family: Arial, Helvetica, sans-serif; max-width: 640px; margin: 0 auto; color: #171717; line-height: 1.6;">
      <p style="margin: 0 0 16px;">${escapeHtml(greeting)}</p>
      <p style="margin: 0 0 16px;">
        I put together a website for <strong>${safeBusiness}</strong> — no cost to preview it, and no obligation.
      </p>
      <p style="margin: 0 0 24px;">
        Take a look when you have a minute:
      </p>
      <p style="margin: 0 0 32px; text-align: center;">
        <a href="${safePreviewUrl}" style="display: inline-block; background: #16a34a; color: #ffffff; font-size: 16px; font-weight: 700; text-decoration: none; padding: 14px 28px; border-radius: 8px;">
          Click here to see your website!
        </a>
      </p>
      <p style="margin: 0 0 16px;">
        If you like it, happy to help you claim it. If not, no worries at all.
      </p>
      <p style="margin: 0;">
        Best,<br />
        ${safeSender}
      </p>
    </div>
    ${trackingPixel}
  `.trim();

  const text = `${greeting}

I put together a website for ${businessName} — no cost to preview it, and no obligation.

Click here to see your website: ${previewUrl}

If you like it, happy to help you claim it. If not, no worries at all.

Best,
${senderName}`;

  return { subject, html, text };
}
