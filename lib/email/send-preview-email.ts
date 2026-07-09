import { createResendClient, getResendFromEmail } from "@/lib/email/resend";
import {
  buildPreviewEmail,
  buildPreviewSiteUrl,
} from "@/lib/email/build-preview-email";

export async function sendPreviewEmail({
  businessName,
  ownerEmail,
  siteSlug,
}: {
  businessName: string;
  ownerEmail: string;
  siteSlug: string;
}): Promise<{ resendMessageId: string | null }> {
  const previewUrl = buildPreviewSiteUrl(siteSlug);
  const { subject, html, text } = buildPreviewEmail({ businessName, previewUrl });

  const resend = createResendClient();
  const sendResult = await resend.emails.send({
    from: getResendFromEmail(),
    to: ownerEmail,
    subject,
    html,
    text,
  });

  if (sendResult.error) {
    throw new Error(sendResult.error.message);
  }

  return { resendMessageId: sendResult.data?.id ?? null };
}
