import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { sendOutreachEmail } from "@/lib/outreach/send-outreach-email";

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const siteSlug = typeof body.siteSlug === "string" ? body.siteSlug.trim() : "";
    const ownerEmail = typeof body.ownerEmail === "string" ? body.ownerEmail.trim() : "";

    if (!siteSlug || !ownerEmail) {
      return NextResponse.json({ error: "siteSlug and ownerEmail are required." }, { status: 400 });
    }

    const supabase = createAdminClient();
    const { data: lead, error } = await supabase
      .from("leads")
      .select("id, business_name, site_slug, owner_email")
      .eq("site_slug", siteSlug)
      .maybeSingle();

    if (error) throw new Error(error.message);
    if (!lead) return NextResponse.json({ error: "Lead not found." }, { status: 404 });

    await sendOutreachEmail({
      businessName: lead.business_name,
      ownerEmail,
      siteSlug: lead.site_slug,
    });

    await supabase
      .from("leads")
      .update({ status: "outreach_sent", owner_email: ownerEmail })
      .eq("id", lead.id);

    return NextResponse.json({ success: true, ownerEmail });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to send outreach.";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
