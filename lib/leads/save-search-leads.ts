import { createAdminClient } from "@/lib/supabase/admin";

import type { LeadSearchResult } from "./types";

const UPSERT_BATCH_SIZE = 50;

function chunk<T>(items: T[], size: number): T[][] {
  const batches: T[][] = [];

  for (let index = 0; index < items.length; index += size) {
    batches.push(items.slice(index, index + size));
  }

  return batches;
}

export type SaveSearchLeadsResult = {
  attempted: number;
  savedIds: string[];
  errors: string[];
};

export async function saveSearchLeadsToSupabase(
  leads: LeadSearchResult[],
): Promise<SaveSearchLeadsResult> {
  const result: SaveSearchLeadsResult = {
    attempted: leads.length,
    savedIds: [],
    errors: [],
  };

  if (leads.length === 0) {
    console.log("[leads/search] No leads to save to Supabase.");
    return result;
  }

  console.log("[leads/search] Saving leads to Supabase...", {
    count: leads.length,
    sample: leads.slice(0, 2).map((lead) => ({
      businessName: lead.businessName,
      city: lead.city,
    })),
  });

  const supabase = createAdminClient();
  const rows = leads.map((lead) => ({
    business_name: lead.businessName,
    city: lead.city,
    industry: lead.industry,
    address: lead.address,
    phone: lead.phone,
    has_website: lead.websiteStatus === "has_site",
    existing_website_url: lead.website,
    status: "new" as const,
  }));

  const batches = chunk(rows, UPSERT_BATCH_SIZE);

  for (const [batchIndex, batch] of batches.entries()) {
    console.log("[leads/search] Upserting batch", {
      batchIndex: batchIndex + 1,
      batchTotal: batches.length,
      batchSize: batch.length,
    });

    const { data, error } = await supabase
      .from("leads")
      .upsert(batch, {
        onConflict: "business_name,city",
        ignoreDuplicates: true,
      })
      .select("id");

    if (error) {
      const message = `${error.message}${error.details ? ` (${error.details})` : ""}${error.hint ? ` hint: ${error.hint}` : ""}`;
      console.error("[leads/search] Supabase upsert batch failed:", {
        batchIndex: batchIndex + 1,
        code: error.code,
        message,
      });
      result.errors.push(message);
      continue;
    }

    const ids = (data ?? []).map((row) => row.id).filter(Boolean) as string[];
    result.savedIds.push(...ids);

    console.log("[leads/search] Batch upsert complete", {
      batchIndex: batchIndex + 1,
      insertedOrReturned: ids.length,
    });
  }

  const sampleCity = leads[0]?.city;

  if (sampleCity) {
    const { count, error: countError } = await supabase
      .from("leads")
      .select("*", { count: "exact", head: true })
      .eq("city", sampleCity);

    if (countError) {
      console.warn("[leads/search] Could not verify lead count:", countError.message);
    } else {
      console.log("[leads/search] Total leads in Supabase for city", {
        city: sampleCity,
        count,
      });
    }
  }

  console.log("[leads/search] Supabase save finished", {
    attempted: result.attempted,
    newRowsReturned: result.savedIds.length,
    errors: result.errors.length,
    note: "newRowsReturned is 0 when leads already exist (ignoreDuplicates)",
  });

  return result;
}
