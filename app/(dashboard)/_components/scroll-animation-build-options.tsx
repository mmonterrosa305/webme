"use client";

import { useEffect, useState } from "react";

import type { VideoPreset } from "@/lib/video-presets/types";

import { PresetVideoThumbnail } from "./preset-video-thumbnail";

export function ScrollAnimationBuildOptions({
  checked,
  onCheckedChange,
  cardHoverChecked,
  onCardHoverCheckedChange,
  disabled,
  industry,
  videoFile,
  onVideoFileChange,
  selectedPresetId,
  onSelectedPresetIdChange,
}: {
  checked: boolean;
  onCheckedChange: (checked: boolean) => void;
  cardHoverChecked: boolean;
  onCardHoverCheckedChange: (checked: boolean) => void;
  disabled?: boolean;
  industry?: string;
  videoFile: File | null;
  onVideoFileChange: (file: File | null) => void;
  selectedPresetId: string | null;
  onSelectedPresetIdChange: (presetId: string | null) => void;
}) {
  const [presets, setPresets] = useState<VideoPreset[]>([]);
  const [loadingPresets, setLoadingPresets] = useState(false);
  const [presetError, setPresetError] = useState<string | null>(null);
  const [playingPresetId, setPlayingPresetId] = useState<string | null>(null);

  function handleCheckedChange(nextChecked: boolean) {
    onCheckedChange(nextChecked);

    if (!nextChecked) {
      onVideoFileChange(null);
      onSelectedPresetIdChange(null);
      setPlayingPresetId(null);
    }
  }

  useEffect(() => {
    if (!checked) {
      return;
    }

    let cancelled = false;

    async function loadPresets() {
      setLoadingPresets(true);
      setPresetError(null);

      try {
        const query = industry
          ? `?industry=${encodeURIComponent(industry)}`
          : "";
        const response = await fetch(`/api/video-presets${query}`);
        const data = (await response.json()) as {
          presets?: VideoPreset[];
          error?: string;
        };

        if (!response.ok) {
          throw new Error(data.error ?? "Failed to load preset videos.");
        }

        if (!cancelled) {
          setPresets(data.presets ?? []);
        }
      } catch (error) {
        if (!cancelled) {
          setPresetError(
            error instanceof Error
              ? error.message
              : "Failed to load preset videos.",
          );
          setPresets([]);
        }
      } finally {
        if (!cancelled) {
          setLoadingPresets(false);
        }
      }
    }

    void loadPresets();

    return () => {
      cancelled = true;
    };
  }, [checked, industry]);

  useEffect(() => {
    if (
      playingPresetId &&
      !presets.some((preset) => preset.id === playingPresetId)
    ) {
      setPlayingPresetId(null);
    }
  }, [presets, playingPresetId]);

  function handlePresetSelect(presetId: string) {
    onSelectedPresetIdChange(selectedPresetId === presetId ? null : presetId);
    onVideoFileChange(null);
  }

  function handleVideoFileChange(file: File | null) {
    onVideoFileChange(file);
    if (file) {
      onSelectedPresetIdChange(null);
    }
  }

  return (
    <div className="w-full space-y-4">
      <div className="flex flex-wrap gap-x-6 gap-y-2">
        <label className="flex cursor-pointer items-center gap-2 text-sm text-neutral-700">
          <input
            type="checkbox"
            checked={checked}
            onChange={(event) => handleCheckedChange(event.target.checked)}
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
              Choose a preset video
            </p>
            <p className="mt-1 text-xs text-neutral-500">
              {industry
                ? `Showing presets for ${industry}.`
                : "Industry will be detected during import — showing all presets."}
              {" "}
              Leave unselected to auto-select from Pexels.
            </p>

            {loadingPresets ? (
              <p className="mt-3 text-sm text-neutral-600">Loading presets...</p>
            ) : presetError ? (
              <p className="mt-3 text-sm text-red-600" role="alert">
                {presetError}
              </p>
            ) : presets.length === 0 ? (
              <p className="mt-3 text-sm text-neutral-600">
                No preset videos for this industry yet. Upload custom video or
                use Pexels auto-select.
              </p>
            ) : (
              <div className="mt-3 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
                {presets.map((preset) => {
                  const isSelected = selectedPresetId === preset.id;

                  return (
                    <div
                      key={preset.id}
                      className={`overflow-hidden rounded-lg border-4 bg-white transition ${
                        isSelected
                          ? "border-blue-600 shadow-md ring-2 ring-blue-200"
                          : "border-transparent ring-1 ring-inset ring-neutral-200 hover:ring-neutral-400"
                      } ${disabled ? "opacity-60" : ""}`}
                    >
                      <PresetVideoThumbnail
                        preset={preset}
                        isPlaying={playingPresetId === preset.id}
                        isSelected={isSelected}
                        disabled={disabled}
                        onPlay={() => setPlayingPresetId(preset.id)}
                        onStop={() => setPlayingPresetId(null)}
                        onSelect={() => handlePresetSelect(preset.id)}
                      />
                      <button
                        type="button"
                        disabled={disabled}
                        aria-pressed={isSelected}
                        onClick={() => handlePresetSelect(preset.id)}
                        className={`w-full px-3 py-2.5 text-left transition disabled:cursor-not-allowed ${
                          isSelected ? "bg-blue-100" : "bg-white"
                        }`}
                      >
                        <p
                          className={`text-sm ${
                            isSelected
                              ? "font-bold text-blue-800"
                              : "font-medium text-neutral-900"
                          }`}
                        >
                          {preset.label}
                        </p>
                        {!industry ? (
                          <p
                            className={`mt-0.5 text-xs ${
                              isSelected
                                ? "font-medium text-blue-700"
                                : "text-neutral-500"
                            }`}
                          >
                            {preset.industry}
                          </p>
                        ) : null}
                        {isSelected ? (
                          <p className="mt-1.5 text-sm font-bold text-blue-700">
                            Selected
                          </p>
                        ) : null}
                      </button>
                    </div>
                  );
                })}
              </div>
            )}
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
                handleVideoFileChange(event.target.files?.[0] ?? null);
              }}
              className="mt-2 block w-full max-w-md text-sm text-neutral-700 file:mr-3 file:rounded-md file:border file:border-neutral-300 file:bg-white file:px-3 file:py-1.5 file:text-sm file:font-medium file:text-neutral-700 hover:file:bg-neutral-50"
            />
            <p className="mt-1 text-xs text-neutral-500">
              Custom upload overrides a selected preset. If nothing is selected,
              a video is auto-selected from Pexels based on industry.
            </p>
            {videoFile ? (
              <p className="mt-1 text-xs text-neutral-600">{videoFile.name}</p>
            ) : null}
          </div>
        </div>
      ) : null}
    </div>
  );
}
