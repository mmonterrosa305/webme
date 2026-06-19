import { createAdminClient } from "@/lib/supabase/admin";

import { MAX_PRESETS_PER_INDUSTRY, type VideoPreset } from "./types";

export async function listVideoPresets(industry?: string): Promise<VideoPreset[]> {
  const supabase = createAdminClient();
  let query = supabase
    .from("video_presets")
    .select("id, industry, label, video_url, thumbnail_url, created_at")
    .order("industry", { ascending: true })
    .order("created_at", { ascending: true });

  if (industry) {
    query = query.eq("industry", industry);
  }

  const { data, error } = await query;

  if (error) {
    throw new Error(error.message);
  }

  return (data ?? []) as VideoPreset[];
}

export async function countVideoPresetsForIndustry(
  industry: string,
): Promise<number> {
  const supabase = createAdminClient();
  const { count, error } = await supabase
    .from("video_presets")
    .select("id", { count: "exact", head: true })
    .eq("industry", industry);

  if (error) {
    throw new Error(error.message);
  }

  return count ?? 0;
}

export async function getVideoPresetById(
  id: string,
): Promise<VideoPreset | null> {
  const supabase = createAdminClient();
  const { data, error } = await supabase
    .from("video_presets")
    .select("id, industry, label, video_url, thumbnail_url, created_at")
    .eq("id", id)
    .maybeSingle();

  if (error) {
    throw new Error(error.message);
  }

  return (data as VideoPreset | null) ?? null;
}

export async function createVideoPreset(input: {
  industry: string;
  label: string;
  videoUrl: string;
  thumbnailUrl: string;
}): Promise<VideoPreset> {
  const industry = input.industry.trim();
  const label = input.label.trim();

  if (!industry || !label) {
    throw new Error("Industry and label are required.");
  }

  const existingCount = await countVideoPresetsForIndustry(industry);
  if (existingCount >= MAX_PRESETS_PER_INDUSTRY) {
    throw new Error(
      `Each industry can have up to ${MAX_PRESETS_PER_INDUSTRY} preset videos.`,
    );
  }

  const supabase = createAdminClient();
  const { data, error } = await supabase
    .from("video_presets")
    .insert({
      industry,
      label,
      video_url: input.videoUrl,
      thumbnail_url: input.thumbnailUrl,
    })
    .select("id, industry, label, video_url, thumbnail_url, created_at")
    .single();

  if (error) {
    throw new Error(error.message);
  }

  return data as VideoPreset;
}

export async function deleteVideoPreset(id: string): Promise<void> {
  const supabase = createAdminClient();
  const { error } = await supabase.from("video_presets").delete().eq("id", id);

  if (error) {
    throw new Error(error.message);
  }
}
