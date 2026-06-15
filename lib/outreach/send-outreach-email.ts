import { createResendClient, getResendFromEmail } from "@/lib/email/resend";
import {
  buildColdOutreachEmail,
  getOutreachPreviewBaseUrl,
} from "@/lib/outreach/build-cold-email";
import {
  createOutreachTrackingToken,
  getOutreachTrackingPixelUrl,
} from "@/lib/outreach/tracking";
import { createAdminClient } from "@/lib/supabase/admin";

type OutreachInsertRow = {
  lead_id: string | null;
  email_to: string;
  subject: string;
  resend_message_id: string | null;
  sent_at: string;
  status: string;
  tracking_token?: string;
};

async function insertOutreachRecord(row: OutreachInsertRow): Promise<void> {
  const supabase = createAdminClient();

  const { error } = await supabase.from("outreach").insert(row);

  if (!error) {
    return;
  }

  if (
    row.tracking_token &&
    (error.message.includes("tracking_token") ||
      error.message.includes("opened_at"))
  ) {
    const { lead_id, email_to, subject, resend_message_id, sent_at, status } =
      row;
    const { error: fallbackError } = await supabase.from("outreach").insert({
      lead_id,
      email_to,
      subject,
      resend_message_id,
      sent_at,
      status,
    });

    if (fallbackError) {
      console.error(
        "[outreach/send] Failed to insert outreach record:",
        fallbackError.message,
      );
      throw new Error(
        `Email was sent but failed to save outreach record: ${fallbackError.message}`,
      );
    }

    console.warn(
      "[outreach/send] Saved outreach without tracking columns — run outreach open tracking migration.",
    );
    return;
  }

  console.error("[outreach/send] Failed to insert outreach record:", error.message);
  throw new Error(
    `Email was sent but failed to save outreach record: ${error.message}`,
  );
}

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
  leadId?: string | null;
}): Promise<{ trackingToken: string; resendMessageId: string | null }> {
  const previewUrl = `${getOutreachPreviewBaseUrl()}/${siteSlug}`;
  const trackingToken = createOutreachTrackingToken();
  const trackingPixelUrl = getOutreachTrackingPixelUrl(trackingToken);

  const { subject, html, text } = buildColdOutreachEmail({
    businessName,
    ownerName: ownerName ?? null,
    previewUrl,
    trackingPixelUrl,
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

  await insertOutreachRecord({
    lead_id: leadId ?? null,
    email_to: ownerEmail,
    subject,
    resend_message_id: resendMessageId,
    sent_at: sentAt,
    status: "sent",
    tracking_token: trackingToken,
  });

  return { trackingToken, resendMessageId };
}
