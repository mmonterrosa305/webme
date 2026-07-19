import { createAdminClient } from "@/lib/supabase/admin";
import { getSupabaseUrl } from "@/lib/supabase/env";
import {
  ALLOWED_SCROLL_HERO_VIDEO_TYPES,
  MAX_SCROLL_HERO_VIDEO_BYTES,
} from "@/lib/agents/scroll-hero-video-shared";
import { PRESET_STORAGE_BUCKET } from "@/lib/video-presets/types";

export type PresetUploadTarget = {
  path: string;
  token: string;
  publicUrl: string;
};

export type PresetFileMetadata = {
  name: string;
  size: number;
  type: string;
};

function sanitizeFilename(name: string): string {
  return name.replace(/[^a-zA-Z0-9._-]/g, "-").slice(0, 80);
}

export function slugifyIndustry(industry: string): string {
  return industry
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 40);
}

export function getPresetPublicStorageUrl(objectPath: string): string {
  const supabase = createAdminClient();
  const { data } = supabase.storage
    .from(PRESET_STORAGE_BUCKET)
    .getPublicUrl(objectPath);
  let url = data.publicUrl;
  const baseUrl = getSupabaseUrl();

  if (!url.startsWith("http")) {
    url = `${baseUrl}/storage/v1/object/public/${PRESET_STORAGE_BUCKET}/${objectPath}`;
  }

  return url;
}

export function buildPresetVideoObjectPath(
  industry: string,
  fileName: string,
): string {
  const extension = fileName.includes(".")
    ? fileName.slice(fileName.lastIndexOf("."))
    : ".mp4";
  const industrySlug = slugifyIndustry(industry) || "industry";
  return `hero-videos/presets/${industrySlug}/${Date.now()}-${sanitizeFilename(fileName || `video${extension}`)}`;
}

export function buildPresetThumbnailObjectPath(
  industry: string,
  contentType: string,
): string {
  const extension = contentType.includes("png")
    ? ".png"
    : contentType.includes("webp")
      ? ".webp"
      : ".jpg";
  const industrySlug = slugifyIndustry(industry) || "industry";
  return `hero-videos/presets/thumbnails/${industrySlug}/${Date.now()}-thumb${extension}`;
}

export function validatePresetVideoMetadata(
  metadata: PresetFileMetadata,
): string | null {
  if (!ALLOWED_SCROLL_HERO_VIDEO_TYPES.has(metadata.type)) {
    return "Only MP4, WebM, or MOV videos are supported.";
  }

  if (metadata.size > MAX_SCROLL_HERO_VIDEO_BYTES) {
    return "Video must be 50 MB or smaller.";
  }

  if (metadata.size <= 0) {
    return "Video file is required.";
  }

  return null;
}

export function validatePresetVideoFile(file: File): string | null {
  return validatePresetVideoMetadata({
    name: file.name,
    size: file.size,
    type: file.type,
  });
}

export function validatePresetThumbnailMetadata(
  metadata: PresetFileMetadata,
): string | null {
  const allowed = new Set(["image/jpeg", "image/png", "image/webp"]);
  if (!allowed.has(metadata.type)) {
    return "Thumbnail must be a JPEG, PNG, or WebP image.";
  }

  if (metadata.size > 5 * 1024 * 1024) {
    return "Thumbnail must be 5 MB or smaller.";
  }

  if (metadata.size <= 0) {
    return "Thumbnail file is required.";
  }

  return null;
}

export function validatePresetThumbnailFile(file: File): string | null {
  return validatePresetThumbnailMetadata({
    name: file.name,
    size: file.size,
    type: file.type,
  });
}

export function isValidPresetVideoPath(path: string, industry: string): boolean {
  const industrySlug = slugifyIndustry(industry) || "industry";
  return (
    path.startsWith(`hero-videos/presets/${industrySlug}/`) &&
    !path.includes("..")
  );
}

export function isValidPresetThumbnailPath(
  path: string,
  industry: string,
): boolean {
  const industrySlug = slugifyIndustry(industry) || "industry";
  return (
    path.startsWith(`hero-videos/presets/thumbnails/${industrySlug}/`) &&
    !path.includes("..")
  );
}

export async function createSignedPresetUploadTarget(
  objectPath: string,
): Promise<PresetUploadTarget> {
  const supabase = createAdminClient();
  const { data, error } = await supabase.storage
    .from(PRESET_STORAGE_BUCKET)
    .createSignedUploadUrl(objectPath);

  if (error || !data?.token) {
    throw new Error(error?.message ?? "Failed to create signed upload URL.");
  }

  return {
    path: data.path,
    token: data.token,
    publicUrl: getPresetPublicStorageUrl(data.path),
  };
}

export async function verifyPresetStorageObjectExists(
  objectPath: string,
): Promise<boolean> {
  const supabase = createAdminClient();
  const lastSlash = objectPath.lastIndexOf("/");
  const folder = lastSlash >= 0 ? objectPath.slice(0, lastSlash) : "";
  const name = objectPath.slice(lastSlash + 1);

  const { data, error } = await supabase.storage
    .from(PRESET_STORAGE_BUCKET)
    .list(folder, { search: name, limit: 1 });

  if (error) {
    throw new Error(error.message);
  }

  return (data ?? []).some((item) => item.name === name);
}

export function logVideoPreset(
  stage: string,
  details: Record<string, unknown> = {},
) {
  console.log(`[video-presets] ${stage}`, details);
}

export function logVideoPresetError(
  stage: string,
  error: unknown,
  details: Record<string, unknown> = {},
) {
  console.error(`[video-presets] ${stage}`, {
    ...details,
    error:
      error instanceof Error
        ? { name: error.name, message: error.message, stack: error.stack }
        : error,
  });
}
