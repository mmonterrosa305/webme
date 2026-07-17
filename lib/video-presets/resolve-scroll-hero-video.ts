import { resolveScrollHeroVideoUrlFromFormData } from "@/lib/agents/upload-scroll-hero-video";

import { getVideoPresetById } from "./queries";
import { SCROLL_HERO_PRESET_FIELD } from "./types";

export type ResolvedScrollHeroVideo = {
  videoUrl: string;
  posterUrl: string | null;
};

export async function resolveScrollHeroVideoForBuild(options: {
  formData?: FormData | null;
  businessName: string;
  presetId?: string | null;
}): Promise<ResolvedScrollHeroVideo | null> {
  if (options.formData) {
    const customUrl = await resolveScrollHeroVideoUrlFromFormData(
      options.formData,
      options.businessName,
    );

    if (customUrl) {
      return { videoUrl: customUrl, posterUrl: null };
    }

    const presetFromForm = options.formData.get(SCROLL_HERO_PRESET_FIELD);
    if (typeof presetFromForm === "string" && presetFromForm.trim()) {
      options.presetId = presetFromForm.trim();
    }
  }

  const presetId = options.presetId?.trim();
  if (!presetId) {
    return null;
  }

  const preset = await getVideoPresetById(presetId);
  if (!preset?.video_url) {
    return null;
  }

  return {
    videoUrl: preset.video_url,
    posterUrl: preset.thumbnail_url?.trim() || null,
  };
}
