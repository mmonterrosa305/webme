import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";

type QueueLeadInput = {
  businessName: string;
  city: string;
  industry?: string | null;
  address?: string | null;
  phone?: string | null;
  siteSlug?: string | null;
  site_slug?: string | null;
  leadId?: string | null;
  lead_id?: string | null;
};

function resolveLeadId(lead: QueueLeadInput): string | null {
  const id =
    (typeof lead.leadId === "string" ? lead.leadId.trim() : "") ||
    (typeof lead.lead_id === "string" ? lead.lead_id.trim() : "");

  return id || null;
}

function resolveSiteSlug(lead: QueueLeadInput): string | null {
  const slug =
    (typeof lead.siteSlug === "string" ? lead.siteSlug.trim() : "") ||
    (typeof lead.site_slug === "string" ? lead.site_slug.trim() : "");

  return slug || null;
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const leads = Array.isArray(body.leads)
      ? (body.leads as QueueLeadInput[])
      : [];

    if (leads.length === 0) {
      return NextResponse.json({ error: "No leads provided." }, { status: 400 });
    }

    const supabase = createAdminClient();

    const leadIdsNeedingSlug = leads
      .filter((lead) => !resolveSiteSlug(lead) && resolveLeadId(lead))
      .map((lead) => resolveLeadId(lead) as string);

    const slugByLeadId = new Map<string, string>();

    if (leadIdsNeedingSlug.length > 0) {
      const { data, error } = await supabase
        .from("leads")
        .select("id, site_slug")
        .in("id", leadIdsNeedingSlug);

      if (error) {
        return NextResponse.json({ error: error.message }, { status: 500 });
      }

      for (const row of data ?? []) {
        const slug =
          typeof row.site_slug === "string" ? row.site_slug.trim() : "";
        if (slug) {
          slugByLeadId.set(row.id, slug);
        }
      }
    }

    const rows = leads.map((lead) => {
      const leadId = resolveLeadId(lead);
      let siteSlug = resolveSiteSlug(lead);

      if (!siteSlug && leadId) {
        siteSlug = slugByLeadId.get(leadId) ?? null;
      }

      console.log("[outreach-queue] saving queue item", {
        businessName: lead.businessName,
        leadId,
        siteSlug,
      });

      return {
        business_name: lead.businessName,
        city: lead.city,
        industry: lead.industry ?? null,
        address: lead.address ?? null,
        phone: lead.phone ?? null,
        site_slug: siteSlug,
        lead_id: leadId,
        status: "pending",
      };
    });

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
    const siteSlug =
      typeof body.site_slug === "string" ? body.site_slug.trim() : undefined;
    const status =
      typeof body.status === "string" ? body.status.trim() : undefined;

    if (!id) {
      return NextResponse.json({ error: "id is required." }, { status: 400 });
    }

    const updates: Record<string, string | null> = {};

    if (ownerEmail !== undefined) {
      updates.owner_email = ownerEmail || null;
    }

    if (siteSlug !== undefined) {
      updates.site_slug = siteSlug;
    }

    if (status !== undefined) {
      updates.status = status;
    }

    if (Object.keys(updates).length === 0) {
      return NextResponse.json(
        { error: "owner_email, status, or site_slug is required." },
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
