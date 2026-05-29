import { NextResponse } from "next/server";

import { createResendClient, getResendFromEmail } from "@/lib/email/resend";
import { buildColdOutreachEmail } from "@/lib/outreach/build-cold-email";
import type { SavedLead } from "@/lib/leads/types";
import { createAdminClient } from "@/lib/supabase/admin";

const PREVIEW_BASE_URL = "https://webme-x6ed.onrender.com/preview";

type LeadForOutreach = {
  id: string;
  business_name: string;
  owner_name: string | null;
  owner_email: string | null;
  site_slug: string | null;
  status: string | null;
};

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const leadId = typeof body.leadId === "string" ? body.leadId.trim() : "";

    if (!leadId) {
      return NextResponse.json({ error: "leadId is required." }, { status: 400 });
    }

    const supabase = createAdminClient();

    const { data: lead, error: fetchError } = await supabase
      .from("leads")
      .select(
        "id, business_name, owner_name, owner_email, site_slug, status, city, industry",
      )
      .eq("id", leadId)
      .maybeSingle();

    if (fetchError) {
      throw new Error(fetchError.message);
    }

    if (!lead) {
      return NextResponse.json({ error: "Lead not found." }, { status: 404 });
    }

    const typedLead = lead as LeadForOutreach;

    if (!typedLead.site_slug) {
      return NextResponse.json(
        { error: "This lead does not have a built site yet." },
        { status: 400 },
      );
    }

    const ownerEmail = typedLead.owner_email?.trim();

    if (!ownerEmail) {
      return NextResponse.json(
        { error: "Email not found for this lead. Add an owner email before sending outreach." },
        { status: 400 },
      );
    }

    const previewUrl = `${PREVIEW_BASE_URL}/${typedLead.site_slug}`;
    const { subject, html, text } = buildColdOutreachEmail({
      businessName: typedLead.business_name,
      ownerName: typedLead.owner_name,
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

    const { data: updatedLead, error: leadUpdateError } = await supabase
      .from("leads")
      .update({
        status: "outreach_sent",
        outreach_sent_at: sentAt,
      })
      .eq("id", leadId)
      .select("id, business_name, city, industry, status, site_slug")
      .maybeSingle();

    if (leadUpdateError) {
      throw new Error(leadUpdateError.message);
    }

    const { error: outreachInsertError } = await supabase.from("outreach").insert({
      lead_id: leadId,
      email_to: ownerEmail,
      subject,
      resend_message_id: resendMessageId,
    });

    if (outreachInsertError) {
      console.error(
        "[outreach/send] Email sent but failed to insert outreach record:",
        outreachInsertError.message,
      );
      throw new Error(
        `Email was sent but failed to save outreach record: ${outreachInsertError.message}`,
      );
    }

    return NextResponse.json({
      success: true,
      previewUrl,
      resendMessageId,
      lead: updatedLead as SavedLead,
    });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Failed to send outreach email.";

    console.error("[outreach/send]", message);

    return NextResponse.json({ error: message }, { status: 500 });
  }
}
