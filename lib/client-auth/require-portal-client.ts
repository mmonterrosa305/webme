import { isPortalEligiblePlan } from "@/lib/client-auth/constants";
import { getClientByEmail } from "@/lib/client-auth/get-client-by-email";
import type { Client } from "@/lib/clients/types";
import { createClient } from "@/lib/supabase/server";

export class ClientAuthError extends Error {
  status: number;

  constructor(message: string, status = 401) {
    super(message);
    this.status = status;
  }
}

export async function requirePortalClient(): Promise<{
  email: string;
  client: Client;
}> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user?.email) {
    throw new ClientAuthError("You must be signed in.", 401);
  }

  const client = await getClientByEmail(user.email);

  if (!client || !isPortalEligiblePlan(client.package)) {
    throw new ClientAuthError("This account does not have portal access.", 403);
  }

  return { email: user.email, client };
}
