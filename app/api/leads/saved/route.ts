import { NextResponse } from "next/server";

import type { SavedLead } from "@/lib/leads/types";
import { createAdminClient } from "@/lib/supabase/admin";

export async function GET() {
  try {
    const supabase = createAdminClient();

    const { data, error } = await supabase
      .from("leads")
      .select("id, business_name, city, industry, status, site_slug")
      .order("created_at", { ascending: false });

    if (error) {
      throw new Error(error.message);
    }

    const rows = data ?? [];
    const countByBusiness = new Map<string, number>();

    for (const row of rows) {
      const key = `${row.business_name}::${row.city}`;
      countByBusiness.set(key, (countByBusiness.get(key) ?? 0) + 1);
    }

    const leads: SavedLead[] = rows.map((row) => {
      const key = `${row.business_name}::${row.city}`;
      return {
        ...row,
        regenerate_count: countByBusiness.get(key) ?? 1,
      };
    });

    return NextResponse.json({ leads });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Failed to load saved leads.";

    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function PATCH(request: Request) {
  try {
    const body = await request.json();
    const id = typeof body.id === "string" ? body.id.trim() : "";
    const action =
      typeof body.action === "string" ? body.action.trim() : "";

    if (!id) {
      return NextResponse.json({ error: "id is required." }, { status: 400 });
    }

    const updates: Record<string, string> = {};

    if (action === "approved") {
      updates.status = "approved";
    } else if (action === "outreach_sent") {
      updates.status = "outreach_sent";
      updates.outreach_sent_at = new Date().toISOString();
    } else {
      return NextResponse.json({ error: "Invalid action." }, { status: 400 });
    }

    const supabase = createAdminClient();
    const { data, error } = await supabase
      .from("leads")
      .update(updates)
      .eq("id", id)
      .select("id, business_name, city, industry, status, site_slug")
      .maybeSingle();

    if (error) {
      throw new Error(error.message);
    }

    if (!data) {
      return NextResponse.json({ error: "Lead not found." }, { status: 404 });
    }

    return NextResponse.json({ lead: data as SavedLead });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Failed to update lead.";

    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function DELETE(request: Request) {
  try {
    const id = new URL(request.url).searchParams.get("id")?.trim();

    if (!id) {
      return NextResponse.json({ error: "id is required." }, { status: 400 });
    }

    const supabase = createAdminClient();
    const { error } = await supabase.from("leads").delete().eq("id", id);

    if (error) {
      throw new Error(error.message);
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Failed to delete lead.";

    return NextResponse.json({ error: message }, { status: 500 });
  }
}
