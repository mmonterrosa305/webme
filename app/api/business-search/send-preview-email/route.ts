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

    if (!siteSlug || !ownerEmail) {
      return NextResponse.json(
        { error: "siteSlug and ownerEmail are required." },
        { status: 400 },
      );
    }

    if (!EMAIL_PATTERN.test(ownerEmail)) {
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
      throw new Error(error.message);
    }

    if (!lead?.site_slug) {
      return NextResponse.json({ error: "Lead not found." }, { status: 404 });
    }

    const { resendMessageId } = await sendPreviewEmail({
      businessName: lead.business_name,
      ownerEmail,
      siteSlug: lead.site_slug,
    });

    await supabase
      .from("leads")
      .update({
        status: "outreach_sent",
        owner_email: ownerEmail,
        outreach_sent_at: new Date().toISOString(),
      })
      .eq("id", lead.id);

    return NextResponse.json({ success: true, ownerEmail, resendMessageId });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Failed to send preview email.";

    return NextResponse.json({ error: message }, { status: 500 });
  }
}
