import { NextResponse } from "next/server";

import { createAdminClient } from "@/lib/supabase/admin";

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const siteSlug =
      typeof body.siteSlug === "string" ? body.siteSlug.trim() : "";

    if (!siteSlug) {
      return NextResponse.json({ error: "siteSlug is required." }, { status: 400 });
    }

    const supabase = createAdminClient();

    const { data: lead, error: leadError } = await supabase
      .from("leads")
      .select(
        "id, business_name, city, industry, address, phone, site_slug, status",
      )
      .eq("site_slug", siteSlug)
      .maybeSingle();

    if (leadError) {
      return NextResponse.json({ error: leadError.message }, { status: 500 });
    }

    if (!lead) {
      return NextResponse.json({ error: "Lead not found." }, { status: 404 });
    }

    const { error: statusError } = await supabase
      .from("leads")
      .update({ status: "ready_for_outreach" })
      .eq("id", lead.id);

    if (statusError) {
      return NextResponse.json({ error: statusError.message }, { status: 500 });
    }

    const { data: existingQueueItem } = await supabase
      .from("outreach_queue")
      .select("id")
      .eq("lead_id", lead.id)
      .eq("status", "pending")
      .maybeSingle();

    if (!existingQueueItem) {
      const { error: queueError } = await supabase.from("outreach_queue").insert({
        business_name: lead.business_name,
        city: lead.city,
        industry: lead.industry ?? null,
        address: lead.address ?? null,
        phone: lead.phone ?? null,
        site_slug: lead.site_slug,
        lead_id: lead.id,
        status: "pending",
      });

      if (queueError) {
        return NextResponse.json({ error: queueError.message }, { status: 500 });
      }
    }

    return NextResponse.json({
      success: true,
      leadId: lead.id,
      siteSlug: lead.site_slug,
    });
  } catch (error) {
    const message =
      error instanceof Error
        ? error.message
        : "Failed to send lead to outreach queue.";

    return NextResponse.json({ error: message }, { status: 500 });
  }
}
