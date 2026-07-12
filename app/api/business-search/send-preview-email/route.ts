import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { sendPreviewEmail } from "@/lib/email/send-preview-email";
import { getResendEnvDiagnostics } from "@/lib/email/resend";

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export async function POST(request: Request) {
  console.log("[send-preview-email] route hit", { timestamp: new Date().toISOString() });

  try {
    const body = await request.json();
    const siteSlug = typeof body.siteSlug === "string" ? body.siteSlug.trim() : "";
    const ownerEmail =
      typeof body.ownerEmail === "string" ? body.ownerEmail.trim() : "";

    const resendDiagnostics = getResendEnvDiagnostics();
    console.log("[send-preview-email] Request received", {
      siteSlug,
      ownerEmail,
      bodyKeys: Object.keys(body ?? {}),
      resendDiagnostics,
    });

    if (!resendDiagnostics.hasApiKey) {
      console.error(
        "[send-preview-email] RESEND_API_KEY missing or placeholder",
        resendDiagnostics,
      );
      return NextResponse.json(
        {
          error:
            "RESEND_API_KEY is missing or invalid on this server. Check Render env vars.",
          resendDiagnostics,
        },
        { status: 500 },
      );
    }

    if (resendDiagnostics.fromEnvMissing) {
      console.error(
        "[send-preview-email] RESEND_FROM_EMAIL missing",
        resendDiagnostics,
      );
      return NextResponse.json(
        {
          error:
            "RESEND_FROM_EMAIL is missing on this server. Set it to a verified sender (e.g. sites@mywebme.com).",
          resendDiagnostics,
        },
        { status: 500 },
      );
    }

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
      from: resendDiagnostics.fromFormatted,
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

    console.error("[send-preview-email] Caught error — exact message:", message);
    console.error("[send-preview-email] Caught error — full object:", error);
    console.error("[send-preview-email] Caught error — stack:", {
      stack: error instanceof Error ? error.stack : undefined,
      resendDiagnostics: getResendEnvDiagnostics(),
    });

    return NextResponse.json(
      {
        error: message,
        resendDiagnostics: getResendEnvDiagnostics(),
      },
      { status: 500 },
    );
  }
}
