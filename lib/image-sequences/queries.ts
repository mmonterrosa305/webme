import { createAdminClient } from "@/lib/supabase/admin";

import {
  MAX_SEQUENCES_PER_INDUSTRY,
  type ImageSequencePreset,
} from "./types";

export async function listImageSequences(
  industry?: string,
): Promise<ImageSequencePreset[]> {
  const supabase = createAdminClient();
  let query = supabase
    .from("image_sequences")
    .select(
      "id, industry, label, frames_urls, thumbnail_url, frame_count, created_at",
    )
    .order("industry", { ascending: true })
    .order("created_at", { ascending: true });

  if (industry) {
    query = query.eq("industry", industry);
  }

  const { data, error } = await query;

  if (error) {
    throw new Error(error.message);
  }

  return (data ?? []) as ImageSequencePreset[];
}

export async function countImageSequencesForIndustry(
  industry: string,
): Promise<number> {
  const supabase = createAdminClient();
  const { count, error } = await supabase
    .from("image_sequences")
    .select("id", { count: "exact", head: true })
    .eq("industry", industry);

  if (error) {
    throw new Error(error.message);
  }

  return count ?? 0;
}

export async function getImageSequenceById(
  id: string,
): Promise<ImageSequencePreset | null> {
  const supabase = createAdminClient();
  const { data, error } = await supabase
    .from("image_sequences")
    .select(
      "id, industry, label, frames_urls, thumbnail_url, frame_count, created_at",
    )
    .eq("id", id)
    .maybeSingle();

  if (error) {
    throw new Error(error.message);
  }

  return (data as ImageSequencePreset | null) ?? null;
}

export async function createImageSequence(input: {
  industry: string;
  label: string;
  framesUrls: string[];
  thumbnailUrl: string;
}): Promise<ImageSequencePreset> {
  const industry = input.industry.trim();
  const label = input.label.trim();

  if (!industry || !label) {
    throw new Error("Industry and label are required.");
  }

  if (input.framesUrls.length < 1) {
    throw new Error("At least one frame URL is required.");
  }

  const existingCount = await countImageSequencesForIndustry(industry);
  if (existingCount >= MAX_SEQUENCES_PER_INDUSTRY) {
    throw new Error(
      `Each industry can have up to ${MAX_SEQUENCES_PER_INDUSTRY} image sequences.`,
    );
  }

  const supabase = createAdminClient();
  const { data, error } = await supabase
    .from("image_sequences")
    .insert({
      industry,
      label,
      frames_urls: input.framesUrls,
      thumbnail_url: input.thumbnailUrl,
      frame_count: input.framesUrls.length,
    })
    .select(
      "id, industry, label, frames_urls, thumbnail_url, frame_count, created_at",
    )
    .single();

  if (error) {
    throw new Error(error.message);
  }

  return data as ImageSequencePreset;
}

export async function deleteImageSequence(id: string): Promise<void> {
  const supabase = createAdminClient();
  const { error } = await supabase.from("image_sequences").delete().eq("id", id);

  if (error) {
    throw new Error(error.message);
  }
}
