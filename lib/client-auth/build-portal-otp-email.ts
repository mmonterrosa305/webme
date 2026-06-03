function escapeHtml(value: string): string {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;");
}

export function buildPortalOtpEmail({
  code,
  expiresInMinutes = 10,
}: {
  code: string;
  expiresInMinutes?: number;
}): { subject: string; html: string; text: string } {
  const safeCode = escapeHtml(code);
  const subject = "Your MyWebMe sign-in code";
  const expiryLabel =
    expiresInMinutes === 1 ? "1 minute" : `${expiresInMinutes} minutes`;

  const html = `
    <div style="font-family: Arial, Helvetica, sans-serif; max-width: 640px; margin: 0 auto; color: #171717; line-height: 1.6;">
      <p style="margin: 0 0 16px;">Hi there,</p>
      <p style="margin: 0 0 24px;">Use this code to sign in to your MyWebMe client portal:</p>
      <p style="margin: 0 0 32px; text-align: center;">
        <span style="display: inline-block; font-size: 40px; font-weight: 700; letter-spacing: 0.35em; padding: 20px 28px; background: #f5f5f5; border-radius: 12px; color: #171717;">
          ${safeCode}
        </span>
      </p>
      <p style="margin: 0 0 16px; font-size: 14px; color: #525252;">
        This code expires in ${expiryLabel} and can only be used once.
      </p>
      <p style="margin: 0; font-size: 14px; color: #737373;">
        If you did not request this code, you can safely ignore this email.
      </p>
    </div>
  `.trim();

  const text = `Your MyWebMe sign-in code: ${code}\n\nThis code expires in ${expiryLabel} and can only be used once.\n\nIf you did not request this code, you can ignore this email.`;

  return { subject, html, text };
}
