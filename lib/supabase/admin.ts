import { createClient } from "@supabase/supabase-js";

import { getSupabaseUrl } from "./env";

function parseJwtRole(key: string): string | null {
  try {
    const payloadSegment = key.split(".")[1];

    if (!payloadSegment) {
      return null;
    }

    const payload = JSON.parse(
      Buffer.from(payloadSegment, "base64url").toString("utf8"),
    ) as { role?: string };

    return payload.role ?? null;
  } catch {
    return null;
  }
}

function getServiceRoleKey(): string {
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY?.trim();

  if (!key) {
    throw new Error("Missing SUPABASE_SERVICE_ROLE_KEY environment variable.");
  }

  if (key.startsWith("your_")) {
    throw new Error(
      "SUPABASE_SERVICE_ROLE_KEY is still a placeholder. Set the service role key from your Supabase project settings.",
    );
  }

  return key;
}

export function createAdminClient() {
  const url = getSupabaseUrl();
  const key = getServiceRoleKey();
  const jwtRole = parseJwtRole(key);

  console.log("[supabase/admin] Creating admin client", {
    url,
    keyLength: key.length,
    keyPrefix: `${key.slice(0, 8)}...`,
    jwtRole,
  });

  if (jwtRole && jwtRole !== "service_role") {
    console.warn(
      "[supabase/admin] SUPABASE_SERVICE_ROLE_KEY JWT role is not service_role:",
      jwtRole,
    );
  }

  return createClient(url, key, {
    auth: {
      persistSession: false,
      autoRefreshToken: false,
    },
  });
}
