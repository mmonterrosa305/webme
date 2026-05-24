import { createClient } from "@supabase/supabase-js";

import { getSupabaseUrl } from "./env";

export function createAdminClient() {
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY?.trim();

  if (!key) {
    throw new Error("Missing SUPABASE_SERVICE_ROLE_KEY environment variable.");
  }

  return createClient(getSupabaseUrl(), key);
}
