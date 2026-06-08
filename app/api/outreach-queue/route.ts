import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const leads = Array.isArray(body.leads) ? body.leads : [];

    if (leads.length === 0) {
      return NextResponse.json({ error: "No leads provided." }, { status: 400 });
    }

    const supabase = createAdminClient();

    const rows = leads.map((lead: {
      businessName: string;
      city: string;
      industry: string;
      address?: string;
      phone?: string;
      siteSlug?: string;
    }) => ({
      business_name: lead.businessName,
      city: lead.city,
      industry: lead.industry,
      address: lead.address ?? null,
      phone: lead.phone ?? null,
      site_slug: lead.siteSlug ?? null,
      status: "pending",
    }));

    const { error } = await supabase.from("outreach_queue").insert(rows);

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ success: true, count: rows.length });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to add to queue.";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function GET() {
  try {
    const supabase = createAdminClient();

    const { data, error } = await supabase
      .from("outreach_queue")
      .select("*")
      .eq("status", "pending")
      .order("created_at", { ascending: true });

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ queue: data ?? [] });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to load queue.";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function PATCH(request: Request) {
  try {
    const body = await request.json();
    const id = typeof body.id === "string" ? body.id.trim() : "";
    const ownerEmail =
      typeof body.owner_email === "string" ? body.owner_email.trim() : undefined;
    const status =
      typeof body.status === "string" ? body.status.trim() : undefined;

    if (!id) {
      return NextResponse.json({ error: "id is required." }, { status: 400 });
    }

    const updates: Record<string, string | null> = {};

    if (ownerEmail !== undefined) {
      updates.owner_email = ownerEmail || null;
    }

    if (status !== undefined) {
      updates.status = status;
    }

    if (Object.keys(updates).length === 0) {
      return NextResponse.json(
        { error: "owner_email or status is required." },
        { status: 400 },
      );
    }

    const supabase = createAdminClient();
    const { error } = await supabase
      .from("outreach_queue")
      .update(updates)
      .eq("id", id);

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Failed to update queue item.";

    return NextResponse.json({ error: message }, { status: 500 });
  }
}
