import { createAdminClient } from "@/lib/supabase/admin";

import type { ImageSequencePreset } from "./types";

function normalizeFrameUrl(url: string): string {
  try {
    const parsed = new URL(url);
    return `${parsed.origin}${parsed.pathname}`;
  } catch {
    return url.split("?")[0] ?? url;
  }
}

export async function matchImageSequenceByFrames(
  framesUrls: string[],
  industry?: string,
): Promise<ImageSequencePreset | null> {
  if (framesUrls.length === 0) {
    return null;
  }

  const supabase = createAdminClient();
  let query = supabase
    .from("image_sequences")
    .select(
      "id, industry, label, frames_urls, thumbnail_url, frame_count, created_at",
    )
    .eq("frame_count", framesUrls.length);

  if (industry) {
    query = query.eq("industry", industry);
  }

  const { data, error } = await query;

  if (error) {
    throw new Error(error.message);
  }

  const normalizedFirst = normalizeFrameUrl(framesUrls[0] ?? "");
  const match = (data ?? []).find((row) => {
    const candidate = row.frames_urls?.[0];
    if (!candidate) {
      return false;
    }

    return (
      candidate === framesUrls[0] ||
      normalizeFrameUrl(candidate) === normalizedFirst
    );
  });

  return (match as ImageSequencePreset | undefined) ?? null;
}
