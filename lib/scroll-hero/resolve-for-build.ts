import type { ScrollHeroMediaType } from "@/lib/agents/scroll-build-options";
import { getImageSequenceById } from "@/lib/image-sequences/queries";
import { SCROLL_HERO_SEQUENCE_PRESET_FIELD } from "@/lib/image-sequences/types";
import { resolveScrollHeroVideoForBuild } from "@/lib/video-presets/resolve-scroll-hero-video";

export type ScrollHeroBuildAssets = {
  mediaType: ScrollHeroMediaType;
  videoUrl: string | null;
  sequencePresetId: string | null;
};

async function resolveSequencePresetId(options: {
  formData?: FormData | null;
  presetId?: string | null;
}): Promise<string | null> {
  let presetId = options.presetId?.trim() ?? null;

  if (options.formData) {
    const presetFromForm = options.formData.get(SCROLL_HERO_SEQUENCE_PRESET_FIELD);
    if (typeof presetFromForm === "string" && presetFromForm.trim()) {
      presetId = presetFromForm.trim();
    }
  }

  if (!presetId) {
    return null;
  }

  const sequence = await getImageSequenceById(presetId);
  return sequence?.id ?? null;
}

export async function resolveScrollHeroAssetsForBuild(options: {
  formData?: FormData | null;
  businessName: string;
  scrollHeroMediaType?: string | null;
  videoPresetId?: string | null;
  sequencePresetId?: string | null;
}): Promise<ScrollHeroBuildAssets> {
  const sequencePresetIdFromBody = options.sequencePresetId?.trim() ?? null;
  const sequencePresetIdFromForm =
    typeof options.formData?.get(SCROLL_HERO_SEQUENCE_PRESET_FIELD) === "string"
      ? options.formData.get(SCROLL_HERO_SEQUENCE_PRESET_FIELD)?.toString().trim() ??
        null
      : null;
  const requestedSequenceId =
    sequencePresetIdFromForm || sequencePresetIdFromBody;

  const mediaType: ScrollHeroMediaType =
    options.scrollHeroMediaType === "image-sequence" || requestedSequenceId
      ? "image-sequence"
      : "video";

  console.log("[resolveScrollHeroAssetsForBuild] input:", {
    businessName: options.businessName,
    scrollHeroMediaType: options.scrollHeroMediaType,
    sequencePresetIdFromBody,
    sequencePresetIdFromForm,
    requestedSequenceId,
    resolvedMediaType: mediaType,
    videoPresetId: options.videoPresetId,
  });

  if (mediaType === "image-sequence") {
    const resolvedSequenceId = await resolveSequencePresetId({
      formData: options.formData,
      presetId: requestedSequenceId,
    });

    console.log("[resolveScrollHeroAssetsForBuild] sequence result:", {
      businessName: options.businessName,
      resolvedSequenceId,
    });

    return {
      mediaType,
      videoUrl: null,
      sequencePresetId: resolvedSequenceId,
    };
  }

  const videoUrl = await resolveScrollHeroVideoForBuild({
    formData: options.formData,
    businessName: options.businessName,
    presetId: options.videoPresetId,
  });

  console.log("[resolveScrollHeroAssetsForBuild] video result:", {
    businessName: options.businessName,
    videoUrl: videoUrl ? "(resolved)" : null,
  });

  return {
    mediaType: "video",
    videoUrl,
    sequencePresetId: null,
  };
}
