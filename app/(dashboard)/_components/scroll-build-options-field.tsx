"use client";

import { ScrollAnimationBuildOptions } from "./scroll-animation-build-options";
import {
  type ScrollBuildOptions,
} from "@/lib/agents/scroll-build-options";

export function ScrollBuildOptionsField({
  options,
  onChange,
  industry,
  disabled,
}: {
  options: ScrollBuildOptions;
  onChange: (next: ScrollBuildOptions) => void;
  industry?: string;
  disabled?: boolean;
}) {
  return (
    <ScrollAnimationBuildOptions
      checked={options.scrollAnimationEffect}
      onCheckedChange={(checked) => {
        if (!checked) {
          onChange({
            scrollAnimationEffect: false,
            scrollHeroPresetId: null,
            scrollHeroVideoFile: null,
            cardHoverEffect: options.cardHoverEffect,
          });
          return;
        }

        onChange({ ...options, scrollAnimationEffect: true });
      }}
      cardHoverChecked={options.cardHoverEffect}
      onCardHoverCheckedChange={(cardHoverEffect) => {
        onChange({ ...options, cardHoverEffect });
      }}
      disabled={disabled}
      industry={industry}
      videoFile={options.scrollHeroVideoFile}
      onVideoFileChange={(file) => {
        onChange({
          ...options,
          scrollAnimationEffect: true,
          scrollHeroVideoFile: file,
          scrollHeroPresetId: file ? null : options.scrollHeroPresetId,
        });
      }}
      selectedPresetId={options.scrollHeroPresetId}
      onSelectedPresetIdChange={(presetId) => {
        onChange({
          ...options,
          scrollAnimationEffect: true,
          scrollHeroPresetId: presetId,
          scrollHeroVideoFile: presetId ? null : options.scrollHeroVideoFile,
        });
      }}
    />
  );
}
