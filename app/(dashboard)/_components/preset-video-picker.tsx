"use client";

import { useEffect, useId, useState } from "react";

import type { VideoPreset } from "@/lib/video-presets/types";

import { PresetVideoThumbnail } from "./preset-video-thumbnail";

export function PresetVideoPicker({
  industry,
  selectedPresetId,
  onSelectedPresetIdChange,
  disabled = false,
  enabled = true,
  showAutoSelect = true,
  gridClassName = "grid gap-3 sm:grid-cols-2 lg:grid-cols-4",
}: {
  industry?: string;
  selectedPresetId: string | null;
  onSelectedPresetIdChange: (presetId: string | null) => void;
  disabled?: boolean;
  enabled?: boolean;
  showAutoSelect?: boolean;
  gridClassName?: string;
}) {
  const [presets, setPresets] = useState<VideoPreset[]>([]);
  const [loadingPresets, setLoadingPresets] = useState(false);
  const [presetError, setPresetError] = useState<string | null>(null);
  const [playingPresetId, setPlayingPresetId] = useState<string | null>(null);
  const presetGroupName = useId();

  useEffect(() => {
    if (!enabled) {
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
  }, [enabled, industry]);

  useEffect(() => {
    if (
      playingPresetId &&
      !presets.some((preset) => preset.id === playingPresetId)
    ) {
      setPlayingPresetId(null);
    }
  }, [presets, playingPresetId]);

  if (!enabled) {
    return null;
  }

  if (loadingPresets) {
    return <p className="text-sm text-neutral-600">Loading presets...</p>;
  }

  if (presetError) {
    return (
      <p className="text-sm text-red-600" role="alert">
        {presetError}
      </p>
    );
  }

  if (presets.length === 0) {
    return (
      <p className="text-sm text-neutral-600">
        No preset videos for this industry yet.
      </p>
    );
  }

  return (
    <div
      role="radiogroup"
      aria-label="Preset video selection"
      className="space-y-3"
    >
      {showAutoSelect ? (
        <label className="flex cursor-pointer items-center gap-2 text-sm text-neutral-700">
          <input
            type="radio"
            name={presetGroupName}
            checked={selectedPresetId === null}
            onChange={() => onSelectedPresetIdChange(null)}
            disabled={disabled}
            className="h-4 w-4 border-neutral-300 text-neutral-900 focus:ring-neutral-900"
          />
          Auto-select from Pexels (default)
        </label>
      ) : null}

      <div className={gridClassName}>
        {presets.map((preset) => {
          const isSelected = selectedPresetId === preset.id;

          return (
            <div
              key={preset.id}
              className={`overflow-hidden rounded-lg border bg-white ${
                isSelected ? "border-blue-600" : "border-neutral-200"
              } ${disabled ? "opacity-60" : ""}`}
            >
              <PresetVideoThumbnail
                preset={preset}
                isPlaying={playingPresetId === preset.id}
                disabled={disabled}
                onPlay={() => setPlayingPresetId(preset.id)}
                onStop={() => setPlayingPresetId(null)}
              />
              <div className="px-3 py-2.5">
                <p className="text-sm font-medium text-neutral-900">
                  {preset.label}
                </p>
                {!industry ? (
                  <p className="mt-0.5 text-xs text-neutral-500">
                    {preset.industry}
                  </p>
                ) : null}
                <label className="mt-2 flex cursor-pointer items-center gap-2">
                  <input
                    type="radio"
                    name={presetGroupName}
                    value={preset.id}
                    checked={isSelected}
                    onChange={() => onSelectedPresetIdChange(preset.id)}
                    disabled={disabled}
                    className="h-4 w-4 border-neutral-300 text-neutral-900 focus:ring-neutral-900"
                  />
                  <span className="text-sm text-neutral-700">Use this video</span>
                </label>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
