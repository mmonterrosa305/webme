import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { findEmailApollo } from "@/lib/agents/find-email-apollo";

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

    if (result.email) {
      const supabase = createAdminClient();
      const { error } = await supabase
        .from("outreach_queue")
        .update({ owner_email: result.email })
        .eq("id", id);

      if (error) {
        return NextResponse.json({ error: error.message }, { status: 500 });
      }
    }

    return NextResponse.json({
      email: result.email,
      firstName: result.firstName,
      lastName: result.lastName,
      title: result.title,
      confidence: result.confidence,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to find email.";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
