"use client";

import { PresetImageSequencePicker } from "./preset-image-sequence-picker";
import { PresetVideoPicker } from "./preset-video-picker";
import type { ScrollHeroMediaType } from "@/lib/agents/scroll-build-options";

export function ScrollAnimationBuildOptions({
  checked,
  onCheckedChange,
  cardHoverChecked,
  onCardHoverCheckedChange,
  disabled,
  industry,
  scrollHeroMediaType,
  onScrollHeroMediaTypeChange,
  videoFile,
  onVideoFileChange,
  selectedPresetId,
  onSelectedPresetIdChange,
  selectedSequencePresetId,
  onSelectedSequencePresetIdChange,
  mediaTypeGroupName = "scrollHeroMediaType",
}: {
  checked: boolean;
  onCheckedChange: (checked: boolean) => void;
  cardHoverChecked: boolean;
  onCardHoverCheckedChange: (checked: boolean) => void;
  disabled?: boolean;
  industry?: string;
  scrollHeroMediaType: ScrollHeroMediaType;
  onScrollHeroMediaTypeChange: (mediaType: ScrollHeroMediaType) => void;
  videoFile: File | null;
  onVideoFileChange: (file: File | null) => void;
  selectedPresetId: string | null;
  onSelectedPresetIdChange: (presetId: string | null) => void;
  selectedSequencePresetId: string | null;
  onSelectedSequencePresetIdChange: (sequenceId: string | null) => void;
  mediaTypeGroupName?: string;
}) {
  return (
    <div className="w-full space-y-4">
      <div className="flex flex-wrap gap-x-6 gap-y-2">
        <label className="flex cursor-pointer items-center gap-2 text-sm text-neutral-700">
          <input
            type="checkbox"
            checked={checked}
            onChange={(event) => onCheckedChange(event.target.checked)}
            disabled={disabled}
            className="h-4 w-4 rounded border-neutral-300 text-neutral-900 focus:ring-neutral-900"
          />
          ✨ Add scroll animation effect
        </label>
        <label className="flex cursor-pointer items-center gap-2 text-sm text-neutral-700">
          <input
            type="checkbox"
            checked={cardHoverChecked}
            onChange={(event) =>
              onCardHoverCheckedChange(event.target.checked)
            }
            disabled={disabled}
            className="h-4 w-4 rounded border-neutral-300 text-neutral-900 focus:ring-neutral-900"
          />
          🖱️ Add card hover effects
        </label>
      </div>

      {checked ? (
        <div className="space-y-4 rounded-xl border border-neutral-200 bg-neutral-50 p-4">
          <div>
            <p className="text-sm font-medium text-neutral-900">
              Scroll hero media
            </p>
            <div
              role="radiogroup"
              aria-label="Scroll hero media type"
              className="mt-2 flex flex-wrap gap-x-6 gap-y-2"
            >
              <label className="flex cursor-pointer items-center gap-2 text-sm text-neutral-700">
                <input
                  type="radio"
                  name={mediaTypeGroupName}
                  checked={scrollHeroMediaType === "video"}
                  onChange={() => onScrollHeroMediaTypeChange("video")}
                  disabled={disabled}
                  className="h-4 w-4 border-neutral-300 text-neutral-900 focus:ring-neutral-900"
                />
                Video
              </label>
              <label className="flex cursor-pointer items-center gap-2 text-sm text-neutral-700">
                <input
                  type="radio"
                  name={mediaTypeGroupName}
                  checked={scrollHeroMediaType === "image-sequence"}
                  onChange={() =>
                    onScrollHeroMediaTypeChange("image-sequence")
                  }
                  disabled={disabled}
                  className="h-4 w-4 border-neutral-300 text-neutral-900 focus:ring-neutral-900"
                />
                🎞️ Use image sequence
              </label>
            </div>
          </div>

          {scrollHeroMediaType === "video" ? (
            <>
              <div>
                <p className="text-sm font-medium text-neutral-900">
                  Choose a preset video
                </p>
                <p className="mt-1 text-xs text-neutral-500">
                  {industry
                    ? `Showing presets for ${industry}.`
                    : "Industry will be detected during import — showing all presets."}
                  {" "}
                  Leave unselected to auto-select from Pexels.
                </p>

                <div className="mt-3">
                  <PresetVideoPicker
                    industry={industry}
                    selectedPresetId={selectedPresetId}
                    onSelectedPresetIdChange={onSelectedPresetIdChange}
                    disabled={disabled}
                    enabled={checked}
                    showAutoSelect
                  />
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-neutral-900">
                  Upload custom video (optional)
                </label>
                <input
                  type="file"
                  accept="video/mp4,video/webm,video/quicktime"
                  disabled={disabled}
                  onChange={(event) => {
                    onVideoFileChange(event.target.files?.[0] ?? null);
                  }}
                  className="mt-2 block w-full max-w-md text-sm text-neutral-700 file:mr-3 file:rounded-md file:border file:border-neutral-300 file:bg-white file:px-3 file:py-1.5 file:text-sm file:font-medium file:text-neutral-700 hover:file:bg-neutral-50"
                />
                <p className="mt-1 text-xs text-neutral-500">
                  Custom upload overrides a selected preset. If nothing is
                  selected, a video is auto-selected from Pexels based on
                  industry.
                </p>
                {videoFile ? (
                  <p className="mt-1 text-xs text-neutral-600">{videoFile.name}</p>
                ) : null}
              </div>
            </>
          ) : (
            <div>
              <p className="text-sm font-medium text-neutral-900">
                Choose an image sequence
              </p>
              <p className="mt-1 text-xs text-neutral-500">
                {industry
                  ? `Showing sequences for ${industry}.`
                  : "Industry will be detected during import — showing all sequences."}
                {" "}
                Select a sequence from the Video Library to scrub through on
                scroll.
              </p>

              <div className="mt-3">
                <PresetImageSequencePicker
                  industry={industry}
                  selectedSequenceId={selectedSequencePresetId}
                  onSelectedSequenceIdChange={onSelectedSequencePresetIdChange}
                  disabled={disabled}
                  enabled={checked}
                  showAutoSelect={false}
                />
              </div>
            </div>
          )}
        </div>
      ) : null}
    </div>
  );
}
