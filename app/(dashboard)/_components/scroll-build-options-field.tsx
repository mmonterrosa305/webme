"use client";

import { useRef } from "react";

import { ScrollAnimationBuildOptions } from "./scroll-animation-build-options";
import {
  type ScrollBuildOptions,
  type ScrollHeroMediaType,
} from "@/lib/agents/scroll-build-options";

export function ScrollBuildOptionsField({
  options,
  onChange,
  industry,
  disabled,
  fieldId,
}: {
  options: ScrollBuildOptions;
  onChange: (next: ScrollBuildOptions) => void;
  industry?: string;
  disabled?: boolean;
  fieldId?: string;
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
            scrollHeroMediaType: "video",
            scrollHeroPresetId: null,
            scrollHeroSequencePresetId: null,
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
      scrollHeroMediaType={options.scrollHeroMediaType}
      onScrollHeroMediaTypeChange={(scrollHeroMediaType: ScrollHeroMediaType) => {
        updateOptions({
          scrollAnimationEffect: true,
          scrollHeroMediaType,
          scrollHeroPresetId:
            scrollHeroMediaType === "video"
              ? optionsRef.current.scrollHeroPresetId
              : null,
          scrollHeroSequencePresetId:
            scrollHeroMediaType === "image-sequence"
              ? optionsRef.current.scrollHeroSequencePresetId
              : null,
          scrollHeroVideoFile:
            scrollHeroMediaType === "video"
              ? optionsRef.current.scrollHeroVideoFile
              : null,
        });
      }}
      videoFile={options.scrollHeroVideoFile}
      onVideoFileChange={(file) => {
        updateOptions({
          scrollAnimationEffect: true,
          scrollHeroMediaType: "video",
          scrollHeroVideoFile: file,
          scrollHeroPresetId: file ? null : optionsRef.current.scrollHeroPresetId,
          scrollHeroSequencePresetId: null,
        });
      }}
      selectedPresetId={options.scrollHeroPresetId}
      onSelectedPresetIdChange={(presetId) => {
        updateOptions({
          scrollAnimationEffect: true,
          scrollHeroMediaType: "video",
          scrollHeroPresetId: presetId,
          scrollHeroVideoFile: presetId
            ? null
            : optionsRef.current.scrollHeroVideoFile,
          scrollHeroSequencePresetId: null,
        });
      }}
      selectedSequencePresetId={options.scrollHeroSequencePresetId}
      onSelectedSequencePresetIdChange={(sequenceId) => {
        updateOptions({
          scrollAnimationEffect: true,
          scrollHeroMediaType: "image-sequence",
          scrollHeroSequencePresetId: sequenceId,
          scrollHeroPresetId: null,
          scrollHeroVideoFile: null,
        });
      }}
      mediaTypeGroupName={
        fieldId ? `scrollHeroMediaType-${fieldId}` : "scrollHeroMediaType"
      }
    />
  );
}
