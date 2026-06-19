import { createAdminClient } from "@/lib/supabase/admin";
import { getSupabaseUrl } from "@/lib/supabase/env";
import {
  ALLOWED_SCROLL_HERO_VIDEO_TYPES,
  MAX_SCROLL_HERO_VIDEO_BYTES,
} from "@/lib/agents/upload-scroll-hero-video";

function sanitizeFilename(name: string): string {
  return name.replace(/[^a-zA-Z0-9._-]/g, "-").slice(0, 80);
}

function slugifyIndustry(industry: string): string {
  return industry
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 40);
}

function getPublicStorageUrl(objectPath: string): string {
  const supabase = createAdminClient();
  const { data } = supabase.storage.from("client-assets").getPublicUrl(objectPath);
  let url = data.publicUrl;
  const baseUrl = getSupabaseUrl();

  if (!url.startsWith("http")) {
    url = `${baseUrl}/storage/v1/object/public/client-assets/${objectPath}`;
  }

  return url;
}

export function validatePresetVideoFile(file: File): string | null {
  if (!ALLOWED_SCROLL_HERO_VIDEO_TYPES.has(file.type)) {
    return "Only MP4, WebM, or MOV videos are supported.";
  }

  if (file.size > MAX_SCROLL_HERO_VIDEO_BYTES) {
    return "Video must be 50 MB or smaller.";
  }

  return null;
}

export function validatePresetThumbnailFile(file: File): string | null {
  const allowed = new Set(["image/jpeg", "image/png", "image/webp"]);
  if (!allowed.has(file.type)) {
    return "Thumbnail must be a JPEG, PNG, or WebP image.";
  }

  if (file.size > 5 * 1024 * 1024) {
    return "Thumbnail must be 5 MB or smaller.";
  }

  return null;
}

export async function uploadPresetVideo(
  file: File,
  industry: string,
): Promise<string> {
  const validationError = validatePresetVideoFile(file);
  if (validationError) {
    throw new Error(validationError);
  }

  const extension = file.name.includes(".")
    ? file.name.slice(file.name.lastIndexOf("."))
    : ".mp4";
  const industrySlug = slugifyIndustry(industry) || "industry";
  const objectPath = `hero-videos/presets/${industrySlug}/${Date.now()}-${sanitizeFilename(file.name || `video${extension}`)}`;
  const buffer = Buffer.from(await file.arrayBuffer());

  const supabase = createAdminClient();
  const { error: uploadError } = await supabase.storage
    .from("client-assets")
    .upload(objectPath, buffer, {
      contentType: file.type,
      upsert: false,
    });

  if (uploadError) {
    throw new Error(uploadError.message);
  }

  return getPublicStorageUrl(objectPath);
}

export async function uploadPresetThumbnail(
  file: File,
  industry: string,
): Promise<string> {
  const validationError = validatePresetThumbnailFile(file);
  if (validationError) {
    throw new Error(validationError);
  }

  const extension = file.type.includes("png")
    ? ".png"
    : file.type.includes("webp")
      ? ".webp"
      : ".jpg";
  const industrySlug = slugifyIndustry(industry) || "industry";
  const objectPath = `hero-videos/presets/thumbnails/${industrySlug}/${Date.now()}-thumb${extension}`;
  const buffer = Buffer.from(await file.arrayBuffer());

  const supabase = createAdminClient();
  const { error: uploadError } = await supabase.storage
    .from("client-assets")
    .upload(objectPath, buffer, {
      contentType: file.type,
      upsert: false,
    });

  if (uploadError) {
    throw new Error(uploadError.message);
  }

  return getPublicStorageUrl(objectPath);
}
