import type { ScrollHeroMediaType } from "@/lib/agents/scroll-build-options";
import { resolveScrollHeroSequenceForBuild } from "@/lib/image-sequences/resolve-scroll-hero-sequence";
import { resolveScrollHeroVideoForBuild } from "@/lib/video-presets/resolve-scroll-hero-video";

export type ScrollHeroBuildAssets = {
  mediaType: ScrollHeroMediaType;
  videoUrl: string | null;
  sequenceFrames: string[] | null;
};

export async function resolveScrollHeroAssetsForBuild(options: {
  formData?: FormData | null;
  businessName: string;
  scrollHeroMediaType?: string | null;
  videoPresetId?: string | null;
  sequencePresetId?: string | null;
}): Promise<ScrollHeroBuildAssets> {
  const mediaType: ScrollHeroMediaType =
    options.scrollHeroMediaType === "image-sequence"
      ? "image-sequence"
      : "video";

  if (mediaType === "image-sequence") {
    const sequenceFrames = await resolveScrollHeroSequenceForBuild({
      formData: options.formData,
      presetId: options.sequencePresetId,
    });

    return {
      mediaType,
      videoUrl: null,
      sequenceFrames,
    };
  }

  const videoUrl = await resolveScrollHeroVideoForBuild({
    formData: options.formData,
    businessName: options.businessName,
    presetId: options.videoPresetId,
  });

  return {
    mediaType: "video",
    videoUrl,
    sequenceFrames: null,
  };
}
