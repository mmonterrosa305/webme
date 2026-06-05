import {
  BASIC_EDITS_PER_MONTH,
  formatResetDate,
  getMonthYear,
  getNextMonthResetDate,
  isUnlimitedEditsPlan,
} from "@/lib/plans/edit-limits";
import { createAdminClient } from "@/lib/supabase/admin";

export type ClientEditQuota = {
  unlimited: boolean;
  limit: number;
  used: number;
  remaining: number;
  resetDate: string;
};

export async function countClientEditsThisMonth(
  clientId: string,
  monthYear: string = getMonthYear(),
): Promise<number> {
  const supabase = createAdminClient();

  const { count, error } = await supabase
    .from("client_edits")
    .select("id", { count: "exact", head: true })
    .eq("client_id", clientId)
    .eq("month_year", monthYear);

  if (error) {
    throw new Error(error.message);
  }

  return count ?? 0;
}

export async function getClientEditQuota(
  clientId: string,
  plan: string,
): Promise<ClientEditQuota> {
  const resetDate = formatResetDate(getNextMonthResetDate());

  if (isUnlimitedEditsPlan(plan)) {
    return {
      unlimited: true,
      limit: Infinity,
      used: 0,
      remaining: Infinity,
      resetDate,
    };
  }

  const used = await countClientEditsThisMonth(clientId);
  const remaining = Math.max(0, BASIC_EDITS_PER_MONTH - used);

  return {
    unlimited: false,
    limit: BASIC_EDITS_PER_MONTH,
    used,
    remaining,
    resetDate,
  };
}

export async function recordClientEdit(clientId: string): Promise<void> {
  const supabase = createAdminClient();
  const monthYear = getMonthYear();

  const { error } = await supabase.from("client_edits").insert({
    client_id: clientId,
    month_year: monthYear,
  });

  if (error) {
    throw new Error(error.message);
  }
}

export async function assertClientCanEdit(
  clientId: string,
  plan: string,
): Promise<ClientEditQuota> {
  const quota = await getClientEditQuota(clientId, plan);

  if (!quota.unlimited && quota.remaining <= 0) {
    throw new Error(
      `You have used your ${quota.limit} edit for this month. Edits reset on ${quota.resetDate}.`,
    );
  }

  return quota;
}
