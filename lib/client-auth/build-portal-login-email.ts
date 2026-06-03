function escapeHtml(value: string): string {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;");
}

export function buildPortalLoginEmail({
  businessName,
  magicLink,
  isWelcome = false,
  expiresInSeconds = 600,
}: {
  businessName: string;
  magicLink: string;
  isWelcome?: boolean;
  expiresInSeconds?: number;
}): { subject: string; html: string; text: string } {
  const expiryMinutes = Math.max(1, Math.round(expiresInSeconds / 60));
  const expiryLabel =
    expiryMinutes === 1 ? "1 minute" : `${expiryMinutes} minutes`;
  const safeBusiness = escapeHtml(businessName);
  const safeLink = escapeHtml(magicLink);
  const subject = isWelcome
    ? "Welcome to MyWebMe — access your client portal"
    : "Your MyWebMe sign-in link";

  const intro = isWelcome
    ? `Your payment is confirmed and <strong>${safeBusiness}</strong> is ready in your client portal.`
    : `Use the button below to sign in to your MyWebMe client portal for <strong>${safeBusiness}</strong>.`;

  const html = `
    <div style="font-family: Arial, Helvetica, sans-serif; max-width: 640px; margin: 0 auto; color: #171717; line-height: 1.6;">
      <p style="margin: 0 0 16px;">Hi there,</p>
      <p style="margin: 0 0 16px;">${intro}</p>
      <p style="margin: 0 0 24px;">Click below to securely sign in. This link expires in ${expiryLabel} and can only be used once.</p>
      <p style="margin: 0 0 32px; text-align: center;">
        <a href="${safeLink}" style="display: inline-block; background: #171717; color: #ffffff; font-size: 16px; font-weight: 700; text-decoration: none; padding: 14px 28px; border-radius: 8px;">
          Open my client portal
        </a>
      </p>
      <p style="margin: 0 0 16px; font-size: 14px; color: #525252;">
        If the button does not work, copy and paste this link into your browser:<br />
        <a href="${safeLink}" style="color: #171717;">${safeLink}</a>
      </p>
      <p style="margin: 0; font-size: 14px; color: #737373;">
        If you did not request this email, you can safely ignore it.
      </p>
    </div>
  `.trim();

  const text = isWelcome
    ? `Welcome to MyWebMe!\n\nYour payment is confirmed and ${businessName} is ready in your client portal.\n\nSign in (expires in ${expiryLabel}): ${magicLink}\n\nIf you did not request this email, you can ignore it.`
    : `Sign in to your MyWebMe client portal for ${businessName} (expires in ${expiryLabel}):\n\n${magicLink}\n\nIf you did not request this email, you can ignore it.`;

  return { subject, html, text };
}
