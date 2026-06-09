import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { findEmailApollo } from "@/lib/agents/find-email-apollo";
import { scrapeSunbiz } from "@/lib/agents/scrape-sunbiz";

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const id = typeof body.id === "string" ? body.id.trim() : "";
    const businessName = typeof body.businessName === "string" ? body.businessName.trim() : "";
    const city = typeof body.city === "string" ? body.city.trim() : "";
    const phone = typeof body.phone === "string" ? body.phone.trim() : null;

    if (!id || !businessName || !city) {
      return NextResponse.json({ error: "id, businessName, and city are required." }, { status: 400 });
    }

    const result = await findEmailApollo({ businessName, city, phone });

    let email = result.email;
    let firstName = result.firstName;
    let lastName = result.lastName;
    const title = result.title;
    const confidence = result.confidence;

    if (!email) {
      const sunbiz = await scrapeSunbiz(businessName);

      if (sunbiz.ownerEmail) {
        email = sunbiz.ownerEmail;
      }

      if (sunbiz.ownerName && !firstName) {
        const parts = sunbiz.ownerName.trim().split(/\s+/);
        firstName = parts[0] ?? null;
        lastName = parts.length > 1 ? parts.slice(1).join(" ") : null;
      }
    }

    if (email) {
      const supabase = createAdminClient();
      const { error } = await supabase
        .from("outreach_queue")
        .update({ owner_email: email })
        .eq("id", id);

      if (error) {
        return NextResponse.json({ error: error.message }, { status: 500 });
      }
    }

    return NextResponse.json({
      email,
      firstName,
      lastName,
      title,
      confidence,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to find email.";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
