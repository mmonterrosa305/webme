import { createResendClient, getResendFromEmail } from "@/lib/email/resend";
import {
  buildColdOutreachEmail,
  getOutreachPreviewBaseUrl,
} from "@/lib/outreach/build-cold-email";
import { createAdminClient } from "@/lib/supabase/admin";

export async function sendOutreachEmail({
  businessName,
  ownerEmail,
  ownerName,
  siteSlug,
  leadId,
}: {
  businessName: string;
  ownerEmail: string;
  ownerName?: string | null;
  siteSlug: string;
  leadId?: string;
}): Promise<void> {
  const previewUrl = `${getOutreachPreviewBaseUrl()}/${siteSlug}`;

  const { subject, html, text } = buildColdOutreachEmail({
    businessName,
    ownerName: ownerName ?? null,
    previewUrl,
  });

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

  const sentAt = new Date().toISOString();
  const resendMessageId = sendResult.data?.id ?? null;

  const supabase = createAdminClient();

  if (leadId) {
    await supabase
      .from("outreach")
      .insert({
        lead_id: leadId,
        email_to: ownerEmail,
        subject,
        resend_message_id: resendMessageId,
        sent_at: sentAt,
        status: "sent",
      });
  }
}
