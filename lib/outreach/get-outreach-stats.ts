import type { SupabaseClient } from "@supabase/supabase-js";

type OutreachRow = {
  id: string;
  lead_id: string | null;
  email_to: string;
  subject: string;
  resend_message_id: string | null;
  sent_at: string | null;
  opened_at: string | null;
  tracking_token: string | null;
  leads:
    | { business_name: string; city: string; site_slug: string | null }
    | { business_name: string; city: string; site_slug: string | null }[]
    | null;
};

type QueueSentRow = {
  id: string;
  business_name: string;
  owner_email: string | null;
  site_slug: string | null;
  created_at: string;
};

export type OutreachHistoryRow = {
  id: string;
  businessName: string;
  email: string;
  subject: string;
  sentAt: string | null;
  status: string;
  opened: boolean;
};

export type OutreachDashboardStats = {
  emailsSent7d: number;
  totalSent: number;
  openRatePercent: number | null;
  openedCount: number;
  trackableCount: number;
  history: OutreachHistoryRow[];
};

function unwrapLead(
  lead: OutreachRow["leads"],
): { business_name: string; city: string; site_slug: string | null } | null {
  if (!lead) {
    return null;
  }

  return Array.isArray(lead) ? (lead[0] ?? null) : lead;
}

function isWithinLastSevenDays(timestamp: string, sevenDaysAgoMs: number): boolean {
  return new Date(timestamp).getTime() >= sevenDaysAgoMs;
}

export async function getOutreachDashboardStats(
  supabase: SupabaseClient,
): Promise<OutreachDashboardStats> {
  const sevenDaysAgoMs = Date.now() - 7 * 24 * 60 * 60 * 1000;

  const outreachSelectWithTracking =
    "id, lead_id, email_to, subject, resend_message_id, sent_at, opened_at, tracking_token, leads(business_name, city, site_slug)";
  const outreachSelectBasic =
    "id, lead_id, email_to, subject, resend_message_id, sent_at, leads(business_name, city, site_slug)";

  let outreachResult = await supabase
    .from("outreach")
    .select(outreachSelectWithTracking)
    .order("sent_at", { ascending: false })
    .limit(200);

  if (
    outreachResult.error &&
    (outreachResult.error.message.includes("opened_at") ||
      outreachResult.error.message.includes("tracking_token") ||
      outreachResult.error.message.includes("sent_at"))
  ) {
    outreachResult = (await supabase
      .from("outreach")
      .select(outreachSelectBasic)
      .order("sent_at", { ascending: false })
      .limit(200)) as typeof outreachResult;
  }

  const [{ data: queueSentRows }] = await Promise.all([
    supabase
      .from("outreach_queue")
      .select("id, business_name, owner_email, site_slug, created_at")
      .eq("status", "sent")
      .order("created_at", { ascending: false }),
  ]);

  if (outreachResult.error) {
    throw new Error(outreachResult.error.message);
  }

  const outreachRows = outreachResult.data;
  const outreach = (outreachRows ?? []) as OutreachRow[];
  const queueSent = (queueSentRows ?? []) as QueueSentRow[];

  const countedKeys = new Set<string>();
  const outreachSlugs = new Set<string>();
  let emailsSent7d = 0;
  let openedCount = 0;
  let trackableCount = 0;

  const history: OutreachHistoryRow[] = [];

  for (const record of outreach) {
    const lead = unwrapLead(record.leads);
    const slug = lead?.site_slug?.trim();
    const key = record.lead_id
      ? `lead:${record.lead_id}`
      : slug
        ? `slug:${slug}`
        : `outreach:${record.id}`;

    if (!countedKeys.has(key)) {
      countedKeys.add(key);
      if (slug) {
        outreachSlugs.add(slug);
      }

      const sentAt = record.sent_at;
      if (sentAt && isWithinLastSevenDays(sentAt, sevenDaysAgoMs)) {
        emailsSent7d += 1;
      }
    }

    if (record.tracking_token) {
      trackableCount += 1;
      if (record.opened_at) {
        openedCount += 1;
      }
    }

    history.push({
      id: record.id,
      businessName: lead?.business_name ?? record.email_to,
      email: record.email_to,
      subject: record.subject,
      sentAt: record.sent_at,
      status: "sent",
      opened: Boolean(record.opened_at),
    });
  }

  for (const item of queueSent) {
    const slug = item.site_slug?.trim();
    if (slug && outreachSlugs.has(slug)) {
      continue;
    }

    const key = slug
      ? `slug:${slug}`
      : `queue:${item.id}`;

    if (countedKeys.has(key)) {
      continue;
    }

    countedKeys.add(key);
    if (isWithinLastSevenDays(item.created_at, sevenDaysAgoMs)) {
      emailsSent7d += 1;
    }

    history.push({
      id: `queue-${item.id}`,
      businessName: item.business_name,
      email: item.owner_email ?? "—",
      subject: "I built your business a website — take a look",
      sentAt: item.created_at,
      status: "sent",
      opened: false,
    });
  }

  history.sort((left, right) => {
    const leftTime = left.sentAt ? new Date(left.sentAt).getTime() : 0;
    const rightTime = right.sentAt ? new Date(right.sentAt).getTime() : 0;
    return rightTime - leftTime;
  });

  const totalSent = countedKeys.size;
  const openRatePercent =
    trackableCount > 0
      ? Math.round((openedCount / trackableCount) * 100)
      : null;

  return {
    emailsSent7d,
    totalSent,
    openRatePercent,
    openedCount,
    trackableCount,
    history: history.slice(0, 50),
  };
}
