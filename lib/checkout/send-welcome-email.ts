import { createResendClient, getResendFromEmail } from "@/lib/email/resend";

import { buildCheckoutWelcomeEmail } from "./build-welcome-email";

export async function sendCheckoutWelcomeEmail(options: {
  email: string;
  businessName: string;
  siteUrl: string;
}): Promise<void> {
  const email = options.email.trim().toLowerCase();

  if (!email) {
    throw new Error("Email is required to send welcome message.");
  }

  const { subject, html, text } = buildCheckoutWelcomeEmail({
    businessName: options.businessName,
    siteUrl: options.siteUrl,
  });

  const resend = createResendClient();
  const sendResult = await resend.emails.send({
    from: getResendFromEmail(),
    to: email,
    subject,
    html,
    text,
  });

  if (sendResult.error) {
    throw new Error(sendResult.error.message);
  }
}
