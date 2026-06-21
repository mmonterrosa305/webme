import { SCROLL_HERO_VIDEO_FIELD } from "@/lib/agents/upload-scroll-hero-video";

export type ScrollBuildOptions = {
  scrollAnimationEffect: boolean;
  scrollHeroPresetId: string | null;
  scrollHeroVideoFile: File | null;
};

export const DEFAULT_SCROLL_BUILD_OPTIONS: ScrollBuildOptions = {
  scrollAnimationEffect: false,
  scrollHeroPresetId: null,
  scrollHeroVideoFile: null,
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
    scrollHeroPresetId: scroll.scrollHeroPresetId ?? undefined,
  };
}

export async function submitBuildSiteRequest(
  payload: Record<string, unknown>,
  scroll: ScrollBuildOptions,
): Promise<Response> {
  const fullPayload = withScrollBuildPayload(payload, scroll);

  if (scroll.scrollAnimationEffect && scroll.scrollHeroVideoFile) {
    const formData = new FormData();
    formData.append("buildPayload", JSON.stringify(fullPayload));
    formData.append(SCROLL_HERO_VIDEO_FIELD, scroll.scrollHeroVideoFile);

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
