import { createResendClient, getResendFromEmail } from "@/lib/email/resend";

import { buildDomainRequestAdminEmail } from "./build-domain-request-admin-email";

function getAdminNotificationEmail(): string {
  const email = process.env.DASHBOARD_EMAIL?.trim();

  if (!email) {
    throw new Error("Missing DASHBOARD_EMAIL environment variable.");
  }

  return email;
}

export async function sendDomainRequestAdminEmail(options: {
  businessName: string;
  clientEmail: string;
  domain: string;
  pricePerYear: number;
  plan: string;
}): Promise<void> {
  const resend = createResendClient();
  const { subject, html, text } = buildDomainRequestAdminEmail(options);

  const { error } = await resend.emails.send({
    from: getResendFromEmail(),
    to: getAdminNotificationEmail(),
    subject,
    html,
    text,
  });

  if (error) {
    throw new Error(error.message);
  }
}
