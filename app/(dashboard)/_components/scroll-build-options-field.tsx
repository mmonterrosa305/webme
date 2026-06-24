"use client";

import { useRef } from "react";

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
  const optionsRef = useRef(options);
  optionsRef.current = options;

  function updateOptions(patch: Partial<ScrollBuildOptions>) {
    onChange({ ...optionsRef.current, ...patch });
  }

  return (
    <ScrollAnimationBuildOptions
      checked={options.scrollAnimationEffect}
      onCheckedChange={(checked) => {
        if (!checked) {
          onChange({
            scrollAnimationEffect: false,
            scrollHeroPresetId: null,
            scrollHeroVideoFile: null,
            cardHoverEffect: optionsRef.current.cardHoverEffect,
          });
          return;
        }

        updateOptions({ scrollAnimationEffect: true });
      }}
      cardHoverChecked={options.cardHoverEffect}
      onCardHoverCheckedChange={(cardHoverEffect) => {
        updateOptions({ cardHoverEffect });
      }}
      disabled={disabled}
      industry={industry}
      videoFile={options.scrollHeroVideoFile}
      onVideoFileChange={(file) => {
        updateOptions({
          scrollAnimationEffect: true,
          scrollHeroVideoFile: file,
          scrollHeroPresetId: file ? null : optionsRef.current.scrollHeroPresetId,
        });
      }}
      selectedPresetId={options.scrollHeroPresetId}
      onSelectedPresetIdChange={(presetId) => {
        updateOptions({
          scrollAnimationEffect: true,
          scrollHeroPresetId: presetId,
          scrollHeroVideoFile: presetId
            ? null
            : optionsRef.current.scrollHeroVideoFile,
        });
      }}
    />
  );
}
