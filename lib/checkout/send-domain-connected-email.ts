import { createResendClient, getResendFromEmail } from "@/lib/email/resend";

import { buildDomainConnectedEmail } from "./build-domain-connected-email";

export async function sendDomainConnectedEmail(options: {
  email: string;
  businessName: string;
  domain: string;
  previewUrl: string;
  portalUrl: string;
}): Promise<void> {
  const email = options.email.trim().toLowerCase();

  if (!email) {
    throw new Error("Email is required to send domain confirmation.");
  }

  const { subject, html, text } = buildDomainConnectedEmail({
    businessName: options.businessName,
    domain: options.domain,
    previewUrl: options.previewUrl,
    portalUrl: options.portalUrl,
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
