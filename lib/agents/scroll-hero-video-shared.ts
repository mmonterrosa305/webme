/**
 * Client-safe scroll-hero video constants and validation.
 * Keep Node-only upload/ffmpeg logic out of this file — client forms import it.
 */

export const SCROLL_HERO_VIDEO_FIELD = "scrollHeroVideo";
export const MAX_SCROLL_HERO_VIDEO_BYTES = 50 * 1024 * 1024;
export const ALLOWED_SCROLL_HERO_VIDEO_TYPES = new Set([
  "video/mp4",
  "video/webm",
  "video/quicktime",
]);

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
