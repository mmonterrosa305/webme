import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { sendOutreachEmail } from "@/lib/outreach/send-outreach-email";

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

    const supabase = createAdminClient();
    const { data: lead, error } = await supabase
      .from("leads")
      .select("id, business_name, site_slug, owner_email, owner_name")
      .eq("site_slug", siteSlug)
      .maybeSingle();

    if (error) {
      throw new Error(error.message);
    }

    if (!lead?.site_slug) {
      return NextResponse.json({ error: "Lead not found." }, { status: 404 });
    }

    const { resendMessageId } = await sendOutreachEmail({
      businessName: lead.business_name,
      ownerEmail,
      ownerName: lead.owner_name,
      siteSlug: lead.site_slug,
      leadId: lead.id,
    });

    await supabase
      .from("leads")
      .update({ status: "outreach_sent", owner_email: ownerEmail })
      .eq("id", lead.id);

    return NextResponse.json({ success: true, ownerEmail, resendMessageId });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Failed to send outreach.";

    return NextResponse.json({ error: message }, { status: 500 });
  }
}
