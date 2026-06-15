import { NextResponse } from "next/server";

import {
  TRANSPARENT_GIF,
} from "@/lib/outreach/tracking";
import { createAdminClient } from "@/lib/supabase/admin";

const GIF_HEADERS = {
  "Content-Type": "image/gif",
  "Content-Length": String(TRANSPARENT_GIF.length),
  "Cache-Control": "no-store, no-cache, must-revalidate, proxy-revalidate",
  Pragma: "no-cache",
  Expires: "0",
};

function gifResponse(): NextResponse {
  return new NextResponse(TRANSPARENT_GIF, {
    status: 200,
    headers: GIF_HEADERS,
  });
}

export async function GET(
  _request: Request,
  context: { params: Promise<{ token: string }> },
) {
  const { token } = await context.params;
  const trackingToken = token?.trim();

  if (!trackingToken || trackingToken.length < 8) {
    return gifResponse();
  }

  try {
    const supabase = createAdminClient();
    const openedAt = new Date().toISOString();

    const { data: existing, error: fetchError } = await supabase
      .from("outreach")
      .select("id, opened_at")
      .eq("tracking_token", trackingToken)
      .maybeSingle();

    if (fetchError) {
      console.error("[outreach/open] lookup failed:", fetchError.message);
      return gifResponse();
    }

    if (existing && !existing.opened_at) {
      const { error: updateError } = await supabase
        .from("outreach")
        .update({ opened_at: openedAt })
        .eq("id", existing.id);

      if (updateError) {
        console.error("[outreach/open] update failed:", updateError.message);
      } else {
        console.log("[outreach/open] recorded open for", existing.id);
      }
    }
  } catch (error) {
    console.error(
      "[outreach/open] unexpected error:",
      error instanceof Error ? error.message : error,
    );
  }

  return gifResponse();
}
