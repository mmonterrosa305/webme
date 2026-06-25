import { SCROLL_HERO_VIDEO_FIELD } from "@/lib/agents/upload-scroll-hero-video";
import { SCROLL_HERO_SEQUENCE_PRESET_FIELD } from "@/lib/image-sequences/types";

export type ScrollHeroMediaType = "video" | "image-sequence";

export type ScrollBuildOptions = {
  scrollAnimationEffect: boolean;
  scrollHeroMediaType: ScrollHeroMediaType;
  scrollHeroPresetId: string | null;
  scrollHeroSequencePresetId: string | null;
  scrollHeroVideoFile: File | null;
  cardHoverEffect: boolean;
};

export const DEFAULT_SCROLL_BUILD_OPTIONS: ScrollBuildOptions = {
  scrollAnimationEffect: false,
  scrollHeroMediaType: "video",
  scrollHeroPresetId: null,
  scrollHeroSequencePresetId: null,
  scrollHeroVideoFile: null,
  cardHoverEffect: false,
};

export function getScrollBuildOptions(
  map: Record<string, ScrollBuildOptions>,
  key: string,
): ScrollBuildOptions {
  return map[key] ?? DEFAULT_SCROLL_BUILD_OPTIONS;
}

export function withScrollBuildPayload(
  payload: Record<string, unknown>,
  scroll: ScrollBuildOptions,
): Record<string, unknown> {
  return {
    ...payload,
    scrollAnimationEffect: scroll.scrollAnimationEffect,
    scrollHeroMediaType: scroll.scrollHeroMediaType,
    scrollHeroPresetId: scroll.scrollHeroPresetId ?? undefined,
    scrollHeroSequencePresetId: scroll.scrollHeroSequencePresetId ?? undefined,
    cardHoverEffect: scroll.cardHoverEffect,
  };
}

export async function submitBuildSiteRequest(
  payload: Record<string, unknown>,
  scroll: ScrollBuildOptions,
): Promise<Response> {
  const fullPayload = withScrollBuildPayload(payload, scroll);

  if (
    scroll.scrollAnimationEffect &&
    scroll.scrollHeroMediaType === "video" &&
    scroll.scrollHeroVideoFile
  ) {
    const formData = new FormData();
    formData.append("buildPayload", JSON.stringify(fullPayload));
    formData.append(SCROLL_HERO_VIDEO_FIELD, scroll.scrollHeroVideoFile);

    return fetch("/api/agents/build-site", {
      method: "POST",
      body: formData,
    });
  }

  if (
    scroll.scrollAnimationEffect &&
    scroll.scrollHeroMediaType === "image-sequence" &&
    scroll.scrollHeroSequencePresetId
  ) {
    const formData = new FormData();
    formData.append("buildPayload", JSON.stringify(fullPayload));
    formData.append(
      SCROLL_HERO_SEQUENCE_PRESET_FIELD,
      scroll.scrollHeroSequencePresetId,
    );

    return fetch("/api/agents/build-site", {
      method: "POST",
      body: formData,
    });
  }

  return fetch("/api/agents/build-site", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(fullPayload),
  });
}
