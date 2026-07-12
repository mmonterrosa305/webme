import {
  createResendClient,
  formatResendError,
  getResendEnvDiagnostics,
  getResendFromEmail,
} from "@/lib/email/resend";
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
  const from = getResendFromEmail();
  const diagnostics = getResendEnvDiagnostics();

  console.log("[email/send-preview-email] Preparing send", {
    siteSlug,
    ownerEmail,
    previewUrl,
    subject,
    from,
    diagnostics,
  });

  const resend = createResendClient();
  const sendResult = await resend.emails.send({
    from,
    to: ownerEmail,
    subject,
    html,
    text,
  });

  console.log("[email/send-preview-email] Resend raw response", {
    siteSlug,
    ownerEmail,
    from,
    data: sendResult.data ?? null,
    error: sendResult.error ?? null,
    errorJson: sendResult.error
      ? formatResendError(sendResult.error)
      : null,
  });

  if (sendResult.error) {
    const exactError = formatResendError(sendResult.error);
    console.error("[email/send-preview-email] Resend rejected send:", exactError);
    console.error(
      "[email/send-preview-email] Full Resend error object:",
      sendResult.error,
    );
    throw new Error(`Resend error: ${exactError}`);
  }

  return { resendMessageId: sendResult.data?.id ?? null };
}
