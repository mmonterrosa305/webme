function escapeHtml(value: string): string {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;");
}

export function buildColdOutreachEmail({
  businessName,
  ownerName,
  previewUrl,
}: {
  businessName: string;
  ownerName: string | null;
  previewUrl: string;
}): { subject: string; html: string; text: string } {
  const greeting = ownerName?.trim() ? `Hi ${ownerName.trim()},` : "Hi there,";
  const subject = `${businessName} — we built your website, no strings attached`;
  const safeBusiness = escapeHtml(businessName);
  const safePreviewUrl = escapeHtml(previewUrl);

  const html = `
    <div style="font-family: Arial, Helvetica, sans-serif; max-width: 640px; margin: 0 auto; color: #171717; line-height: 1.6;">
      <p style="margin: 0 0 16px;">${escapeHtml(greeting)}</p>
      <p style="margin: 0 0 16px;">
        I came across <strong>${safeBusiness}</strong> and noticed you might not have a website online yet — or at least not one that's easy for customers to find.
      </p>
      <p style="margin: 0 0 16px;">
        So we took the liberty of building a professional site for your business. No pitch deck, no pressure — just something you can look at and decide if it's useful.
      </p>
      <p style="margin: 0 0 24px;">
        Here's your free preview link. It's completely free to view, and there's zero obligation. If you love it, you can claim it for a small fee whenever you're ready.
      </p>
      <p style="margin: 0 0 32px; text-align: center;">
        <a href="${safePreviewUrl}" style="display: inline-block; background: #16a34a; color: #ffffff; font-size: 16px; font-weight: 700; text-decoration: none; padding: 14px 28px; border-radius: 8px;">
          View My Free Website
        </a>
      </p>
      <p style="margin: 0 0 16px;">
        Take a look when you have a minute — we'd love to know what you think.
      </p>
      <p style="margin: 0;">
        Best,<br />
        The WebMe Team
      </p>
    </div>
  `.trim();

  const text = `${greeting}

I came across ${businessName} and noticed you might not have a website online yet — or at least not one that's easy for customers to find.

So we took the liberty of building a professional site for your business. No pitch deck, no pressure — just something you can look at and decide if it's useful.

Here's your free preview link (${previewUrl}). It's completely free to view, and there's zero obligation. If you love it, you can claim it for a small fee whenever you're ready.

Take a look when you have a minute — we'd love to know what you think.

Best,
The WebMe Team`;

  return { subject, html, text };
}
