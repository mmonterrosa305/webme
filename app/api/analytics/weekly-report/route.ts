import { NextResponse } from "next/server";

import { buildWeeklyReportEmail } from "@/lib/analytics/build-weekly-report-email";
import { generateWeeklyIndustryContent } from "@/lib/analytics/generate-weekly-industry-content";
import { createResendClient, getResendFromEmail } from "@/lib/email/resend";
import { createAdminClient } from "@/lib/supabase/admin";

function verifyCronSecret(request: Request): boolean {
  const expected = process.env.CRON_SECRET?.trim();

  if (!expected) {
    return false;
  }

  return request.headers.get("x-cron-secret") === expected;
}

async function getAnalyticsCounts(
  siteSlug: string,
  since: string,
): Promise<{ pageViews: number; formSubmits: number }> {
  const supabase = createAdminClient();

  const { data, error } = await supabase
    .from("site_analytics")
    .select("event_type")
    .eq("site_slug", siteSlug)
    .gte("created_at", since);

  if (error) {
    throw new Error(error.message);
  }

  let pageViews = 0;
  let formSubmits = 0;

  for (const event of data ?? []) {
    if (event.event_type === "page_view") {
      pageViews++;
    } else if (event.event_type === "form_submit") {
      formSubmits++;
    }
  }

  return { pageViews, formSubmits };
}

export async function GET(request: Request) {
  if (!verifyCronSecret(request)) {
    return NextResponse.json({ error: "Unauthorized." }, { status: 401 });
  }

  try {
    const supabase = createAdminClient();
    const sevenDaysAgo = new Date(
      Date.now() - 7 * 24 * 60 * 60 * 1000,
    ).toISOString();

    const { data: clients, error: clientsError } = await supabase
      .from("clients")
      .select("id, business_name, owner_email, site_slug, site_url, industry")
      .eq("plan", "elite");

    if (clientsError) {
      throw new Error(clientsError.message);
    }

    const resend = createResendClient();
    const results: {
      clientId: string;
      businessName: string;
      ownerEmail: string;
      pageViews: number;
      formSubmits: number;
      sent: boolean;
      error?: string;
    }[] = [];

    for (const client of clients ?? []) {
      if (!client.owner_email?.trim()) {
        results.push({
          clientId: client.id,
          businessName: client.business_name,
          ownerEmail: "",
          pageViews: 0,
          formSubmits: 0,
          sent: false,
          error: "Missing owner email.",
        });
        continue;
      }

      if (!client.site_slug?.trim()) {
        results.push({
          clientId: client.id,
          businessName: client.business_name,
          ownerEmail: client.owner_email,
          pageViews: 0,
          formSubmits: 0,
          sent: false,
          error: "Missing site slug.",
        });
        continue;
      }

      const { pageViews, formSubmits } = await getAnalyticsCounts(
        client.site_slug,
        sevenDaysAgo,
      );

      const industry = client.industry?.trim() || "local business";
      const content = await generateWeeklyIndustryContent(industry);

      const { subject, html, text } = buildWeeklyReportEmail({
        businessName: client.business_name,
        industry,
        pageViews,
        formSubmits,
        content,
      });

      const sendResult = await resend.emails.send({
        from: getResendFromEmail(),
        to: client.owner_email,
        subject,
        html,
        text,
      });

      if (sendResult.error) {
        results.push({
          clientId: client.id,
          businessName: client.business_name,
          ownerEmail: client.owner_email,
          pageViews,
          formSubmits,
          sent: false,
          error: sendResult.error.message,
        });
        continue;
      }

      results.push({
        clientId: client.id,
        businessName: client.business_name,
        ownerEmail: client.owner_email,
        pageViews,
        formSubmits,
        sent: true,
      });
    }

    const emailsSent = results.filter((result) => result.sent).length;

    return NextResponse.json({
      success: true,
      emailsSent,
      totalClients: results.length,
      results,
    });
  } catch (error) {
    const message =
      error instanceof Error
        ? error.message
        : "Failed to send weekly analytics reports.";

    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function POST(request: Request) {
  return GET(request);
}
