import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { sendPreviewEmail } from "@/lib/email/send-preview-email";

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const siteSlug = typeof body.siteSlug === "string" ? body.siteSlug.trim() : "";
    const ownerEmail =
      typeof body.ownerEmail === "string" ? body.ownerEmail.trim() : "";

    console.log("[send-preview-email] Request received", {
      siteSlug,
      ownerEmail,
      bodyKeys: Object.keys(body ?? {}),
    });

    if (!siteSlug || !ownerEmail) {
      console.error("[send-preview-email] Missing siteSlug or ownerEmail", {
        siteSlug,
        ownerEmail,
      });
      return NextResponse.json(
        { error: "siteSlug and ownerEmail are required." },
        { status: 400 },
      );
    }

    if (!EMAIL_PATTERN.test(ownerEmail)) {
      console.error("[send-preview-email] Invalid email", { ownerEmail });
      return NextResponse.json(
        { error: "Please enter a valid email address." },
        { status: 400 },
      );
    }

    const supabase = createAdminClient();
    const { data: lead, error } = await supabase
      .from("leads")
      .select("id, business_name, site_slug")
      .eq("site_slug", siteSlug)
      .maybeSingle();

    if (error) {
      console.error("[send-preview-email] Lead lookup failed", {
        siteSlug,
        error: error.message,
      });
      throw new Error(error.message);
    }

    if (!lead?.site_slug) {
      console.error("[send-preview-email] Lead not found", { siteSlug });
      return NextResponse.json({ error: "Lead not found." }, { status: 404 });
    }

    console.log("[send-preview-email] Sending via Resend", {
      siteSlug: lead.site_slug,
      ownerEmail,
      businessName: lead.business_name,
    });

    const { resendMessageId } = await sendPreviewEmail({
      businessName: lead.business_name,
      ownerEmail,
      siteSlug: lead.site_slug,
    });

    console.log("[send-preview-email] Resend result", {
      siteSlug: lead.site_slug,
      ownerEmail,
      resendMessageId,
      success: Boolean(resendMessageId),
    });

    const { error: updateError } = await supabase
      .from("leads")
      .update({
        status: "outreach_sent",
        owner_email: ownerEmail,
        outreach_sent_at: new Date().toISOString(),
      })
      .eq("id", lead.id);

    if (updateError) {
      console.error("[send-preview-email] Failed to mark lead outreach_sent", {
        leadId: lead.id,
        error: updateError.message,
      });
      throw new Error(updateError.message);
    }

    console.log("[send-preview-email] Lead marked outreach_sent", {
      leadId: lead.id,
      siteSlug: lead.site_slug,
      ownerEmail,
    });

    return NextResponse.json({ success: true, ownerEmail, resendMessageId });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Failed to send preview email.";

    console.error("[send-preview-email] Caught error", {
      message,
      error,
      stack: error instanceof Error ? error.stack : undefined,
    });

    return NextResponse.json({ error: message }, { status: 500 });
  }
}
