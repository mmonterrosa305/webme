import { createAdminClient } from "@/lib/supabase/admin";
import { getSupabaseUrl } from "@/lib/supabase/env";
import { ensureMp4FastStart } from "@/lib/video-presets/ensure-mp4-faststart";

export const SCROLL_HERO_VIDEO_FIELD = "scrollHeroVideo";
export const MAX_SCROLL_HERO_VIDEO_BYTES = 50 * 1024 * 1024;
export const ALLOWED_SCROLL_HERO_VIDEO_TYPES = new Set([
  "video/mp4",
  "video/webm",
  "video/quicktime",
]);

function sanitizeFilename(name: string): string {
  return name.replace(/[^a-zA-Z0-9._-]/g, "-").slice(0, 80);
}

function slugifyBusinessName(businessName: string): string {
  return businessName
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 40);
}

export function validateScrollHeroVideoFile(file: File): string | null {
  if (!ALLOWED_SCROLL_HERO_VIDEO_TYPES.has(file.type)) {
    return "Only MP4, WebM, or MOV videos are supported.";
  }

  if (file.size > MAX_SCROLL_HERO_VIDEO_BYTES) {
    return "Video must be 50 MB or smaller.";
  }

  return null;
}

export function getScrollHeroVideoFromFormData(
  formData: FormData,
): File | null {
  const file = formData.get(SCROLL_HERO_VIDEO_FIELD);

  if (!(file instanceof File) || file.size === 0) {
    return null;
  }

  return file;
}

export async function uploadScrollHeroVideoForBuild(
  file: File,
  businessName: string,
): Promise<string> {
  const validationError = validateScrollHeroVideoFile(file);
  if (validationError) {
    throw new Error(validationError);
  }

  const extension = file.name.includes(".")
    ? file.name.slice(file.name.lastIndexOf("."))
    : file.type.includes("webm")
      ? ".webm"
      : file.type.includes("quicktime")
        ? ".mov"
        : ".mp4";
  const slug = slugifyBusinessName(businessName) || "site";
  const objectPath = `hero-videos/build/${slug}/${Date.now()}-${sanitizeFilename(file.name || `upload${extension}`)}`;
  const rawBuffer = Buffer.from(await file.arrayBuffer());

  // Re-mux so the moov atom is at the start — without this, browsers show
  // a frozen 00:00/00:00 video (same bug found on preset uploads earlier).
  // Only applies to MP4; webm/mov are stored as-is.
  const isMp4 = file.type === "video/mp4" || extension === ".mp4";
  const buffer = isMp4
    ? (ensureMp4FastStart(rawBuffer) ?? rawBuffer)
    : rawBuffer;

  const supabase = createAdminClient();
  const { error: uploadError } = await supabase.storage
    .from("client-assets")
    .upload(objectPath, buffer, {
      contentType: file.type,
      upsert: true,
    });

  if (uploadError) {
    throw new Error(uploadError.message);
  }

  const { data: publicUrlData } = supabase.storage
    .from("client-assets")
    .getPublicUrl(objectPath);

  let videoUrl = publicUrlData.publicUrl;
  const baseUrl = getSupabaseUrl();

  if (!videoUrl.startsWith("http")) {
    videoUrl = `${baseUrl}/storage/v1/object/public/client-assets/${objectPath}`;
  }

  return videoUrl;
}

export async function resolveScrollHeroVideoUrlFromFormData(
  formData: FormData,
  businessName: string,
): Promise<string | null> {
  const file = getScrollHeroVideoFromFormData(formData);
  if (!file) {
    return null;
  }

  return uploadScrollHeroVideoForBuild(file, businessName);
}
