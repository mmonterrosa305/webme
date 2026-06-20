"use client";

import { useCallback, useEffect, useMemo, useState } from "react";

import { INDUSTRIES } from "@/lib/agents/site-options";
import { readJsonResponse } from "@/lib/api/fetch-json";
import {
  MAX_PRESETS_PER_INDUSTRY,
  type VideoPreset,
} from "@/lib/video-presets/types";

import { Panel } from "../_components/dashboard-ui";

const inputClassName =
  "w-full rounded-lg border border-neutral-300 bg-white px-4 py-2.5 text-neutral-900 outline-none transition placeholder:text-neutral-400 focus:border-neutral-900 focus:ring-2 focus:ring-neutral-200";

async function captureVideoThumbnail(file: File): Promise<File> {
  const objectUrl = URL.createObjectURL(file);

  try {
    const video = document.createElement("video");
    video.src = objectUrl;
    video.muted = true;
    video.playsInline = true;

    await new Promise<void>((resolve, reject) => {
      video.onloadeddata = () => resolve();
      video.onerror = () => reject(new Error("Could not load video for thumbnail."));
    });

    video.currentTime = Math.min(0.5, video.duration || 0.5);

    await new Promise<void>((resolve) => {
      video.onseeked = () => resolve();
    });

    const canvas = document.createElement("canvas");
    canvas.width = video.videoWidth || 640;
    canvas.height = video.videoHeight || 360;
    const context = canvas.getContext("2d");

    if (!context) {
      throw new Error("Could not create thumbnail canvas.");
    }

    context.drawImage(video, 0, 0, canvas.width, canvas.height);

    const blob = await new Promise<Blob>((resolve, reject) => {
      canvas.toBlob(
        (result) => {
          if (result) {
            resolve(result);
          } else {
            reject(new Error("Could not generate thumbnail."));
          }
        },
        "image/jpeg",
        0.85,
      );
    });

    return new File([blob], "thumbnail.jpg", { type: "image/jpeg" });
  } finally {
    URL.revokeObjectURL(objectUrl);
  }
}

function groupPresetsByIndustry(
  presets: VideoPreset[],
): Record<string, VideoPreset[]> {
  return presets.reduce<Record<string, VideoPreset[]>>((groups, preset) => {
    if (!groups[preset.industry]) {
      groups[preset.industry] = [];
    }

    groups[preset.industry].push(preset);
    return groups;
  }, {});
}

function PresetVideoCard({
  preset,
  isPlaying,
  onPlay,
  onStop,
  deleting,
  onDelete,
}: {
  preset: VideoPreset;
  isPlaying: boolean;
  onPlay: () => void;
  onStop: () => void;
  deleting: boolean;
  onDelete: () => void;
}) {
  return (
    <article className="overflow-hidden rounded-xl border border-neutral-200 bg-white shadow-sm">
      <div className="relative aspect-video bg-neutral-900">
        {isPlaying ? (
          <video
            key={preset.id}
            src={preset.video_url}
            controls
            autoPlay
            playsInline
            className="h-full w-full object-cover"
            onEnded={onStop}
          />
        ) : (
          <>
            <img
              src={preset.thumbnail_url}
              alt={preset.label}
              className="h-full w-full object-cover"
            />
            <button
              type="button"
              aria-label={`Preview ${preset.label}`}
              onClick={onPlay}
              className="absolute inset-0 flex items-center justify-center bg-black/20 transition hover:bg-black/30"
            >
              <span className="flex h-10 w-10 items-center justify-center rounded-full bg-white/95 text-neutral-900 shadow-md">
                <svg
                  viewBox="0 0 24 24"
                  aria-hidden
                  className="ml-0.5 h-4 w-4 fill-current"
                >
                  <path d="M8 5v14l11-7z" />
                </svg>
              </span>
            </button>
          </>
        )}
      </div>
      <div className="flex items-center justify-between gap-2 px-3 py-3">
        <div className="min-w-0">
          <p className="truncate text-sm font-medium text-neutral-900">
            {preset.label}
          </p>
        </div>
        <button
          type="button"
          disabled={deleting}
          onClick={onDelete}
          className="shrink-0 rounded-md border border-neutral-300 px-2.5 py-1 text-xs font-medium text-neutral-700 transition hover:bg-neutral-50 disabled:cursor-not-allowed disabled:opacity-60"
        >
          {deleting ? "Deleting..." : "Delete"}
        </button>
      </div>
    </article>
  );
}

export function VideoLibraryManager() {
  const [presets, setPresets] = useState<VideoPreset[]>([]);
  const [loading, setLoading] = useState(true);
  const [uploadIndustry, setUploadIndustry] = useState<string>(INDUSTRIES[0]);
  const [uploadLabel, setUploadLabel] = useState("");
  const [uploadVideoFile, setUploadVideoFile] = useState<File | null>(null);
  const [uploading, setUploading] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [playingPresetId, setPlayingPresetId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);

  const groupedPresets = useMemo(
    () => groupPresetsByIndustry(presets),
    [presets],
  );

  const industryCount = presets.filter(
    (preset) => preset.industry === uploadIndustry,
  ).length;

  const suggestedLabel = `Option ${industryCount + 1}`;

  const loadPresets = useCallback(async () => {
    setLoading(true);
    setError(null);

    try {
      const response = await fetch("/api/video-presets");
      const data = await readJsonResponse<{
        presets?: VideoPreset[];
        error?: string;
      }>(response);

      if (!response.ok) {
        throw new Error(data.error ?? "Failed to load presets.");
      }

      setPresets(data.presets ?? []);
    } catch (loadError) {
      setError(
        loadError instanceof Error
          ? loadError.message
          : "Failed to load presets.",
      );
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadPresets();
  }, [loadPresets]);

  async function handleUpload(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    setMessage(null);

    if (!uploadVideoFile) {
      setError("Choose a video file to upload.");
      return;
    }

    if (industryCount >= MAX_PRESETS_PER_INDUSTRY) {
      setError(
        `This industry already has ${MAX_PRESETS_PER_INDUSTRY} preset videos.`,
      );
      return;
    }

    setUploading(true);

    try {
      const thumbnailFile = await captureVideoThumbnail(uploadVideoFile);
      const formData = new FormData();
      formData.append("industry", uploadIndustry);
      formData.append("label", uploadLabel.trim() || suggestedLabel);
      formData.append("video", uploadVideoFile);
      formData.append("thumbnail", thumbnailFile);

      const response = await fetch("/api/video-presets", {
        method: "POST",
        body: formData,
      });

      const data = await readJsonResponse<{
        preset?: VideoPreset;
        error?: string;
      }>(response);

      if (!response.ok) {
        throw new Error(data.error ?? "Failed to upload preset.");
      }

      setUploadVideoFile(null);
      setUploadLabel("");
      setMessage(`Added ${data.preset?.label ?? "preset"} for ${uploadIndustry}.`);
      await loadPresets();
    } catch (uploadError) {
      setError(
        uploadError instanceof Error
          ? uploadError.message
          : "Failed to upload preset.",
      );
    } finally {
      setUploading(false);
    }
  }

  async function handleDelete(preset: VideoPreset) {
    setDeletingId(preset.id);
    setError(null);
    setMessage(null);

    try {
      const response = await fetch(`/api/video-presets/${preset.id}`, {
        method: "DELETE",
      });

      const data = await readJsonResponse<{ error?: string }>(response);

      if (!response.ok) {
        throw new Error(data.error ?? "Failed to delete preset.");
      }

      setMessage(`Deleted ${preset.label} (${preset.industry}).`);
      if (playingPresetId === preset.id) {
        setPlayingPresetId(null);
      }
      await loadPresets();
    } catch (deleteError) {
      setError(
        deleteError instanceof Error
          ? deleteError.message
          : "Failed to delete preset.",
      );
    } finally {
      setDeletingId(null);
    }
  }

  return (
    <div className="space-y-6">
      <Panel
        title="Upload preset video"
        subtitle={`Add up to ${MAX_PRESETS_PER_INDUSTRY} scroll hero videos per industry.`}
      >
        <form onSubmit={(event) => void handleUpload(event)} className="space-y-4 px-5 py-5">
          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <label
                htmlFor="presetIndustry"
                className="mb-2 block text-sm font-medium text-neutral-700"
              >
                Industry
              </label>
              <select
                id="presetIndustry"
                value={uploadIndustry}
                onChange={(event) => setUploadIndustry(event.target.value)}
                className={inputClassName}
                disabled={uploading}
              >
                {INDUSTRIES.map((industry) => (
                  <option key={industry} value={industry}>
                    {industry}
                  </option>
                ))}
              </select>
              <p className="mt-1 text-xs text-neutral-500">
                {industryCount} of {MAX_PRESETS_PER_INDUSTRY} slots used
              </p>
            </div>

            <div>
              <label
                htmlFor="presetLabel"
                className="mb-2 block text-sm font-medium text-neutral-700"
              >
                Label
              </label>
              <input
                id="presetLabel"
                type="text"
                value={uploadLabel}
                onChange={(event) => setUploadLabel(event.target.value)}
                placeholder={suggestedLabel}
                className={inputClassName}
                disabled={uploading}
              />
            </div>
          </div>

          <div>
            <label
              htmlFor="presetVideo"
              className="mb-2 block text-sm font-medium text-neutral-700"
            >
              Video file
            </label>
            <input
              id="presetVideo"
              type="file"
              accept="video/mp4,video/webm,video/quicktime"
              disabled={uploading || industryCount >= MAX_PRESETS_PER_INDUSTRY}
              onChange={(event) => {
                setUploadVideoFile(event.target.files?.[0] ?? null);
              }}
              className="block w-full text-sm text-neutral-700 file:mr-3 file:rounded-md file:border file:border-neutral-300 file:bg-white file:px-3 file:py-1.5 file:text-sm file:font-medium file:text-neutral-700 hover:file:bg-neutral-50"
            />
            {uploadVideoFile ? (
              <p className="mt-1 text-xs text-neutral-600">{uploadVideoFile.name}</p>
            ) : null}
          </div>

          <button
            type="submit"
            disabled={
              uploading ||
              !uploadVideoFile ||
              industryCount >= MAX_PRESETS_PER_INDUSTRY
            }
            className="rounded-lg bg-neutral-900 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-neutral-800 disabled:cursor-not-allowed disabled:opacity-60"
          >
            {uploading ? "Uploading..." : "Add preset video"}
          </button>
        </form>
      </Panel>

      <Panel
        title="Preset library"
        subtitle="Videos organized by industry for scroll animation builds."
      >
        {loading ? (
          <p className="px-5 py-6 text-sm text-neutral-600">Loading presets...</p>
        ) : presets.length === 0 ? (
          <p className="px-5 py-6 text-sm text-neutral-600">
            No preset videos yet. Upload one above to get started.
          </p>
        ) : (
          <div className="space-y-6 px-5 py-5">
            {Object.entries(groupedPresets).map(([industry, industryPresets]) => (
              <section key={industry}>
                <div className="mb-3 flex items-center justify-between gap-3">
                  <h3 className="text-sm font-semibold text-neutral-900">
                    {industry}
                  </h3>
                  <span className="text-xs text-neutral-500">
                    {industryPresets.length} of {MAX_PRESETS_PER_INDUSTRY}
                  </span>
                </div>

                <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
                  {industryPresets.map((preset) => (
                    <PresetVideoCard
                      key={preset.id}
                      preset={preset}
                      isPlaying={playingPresetId === preset.id}
                      onPlay={() => setPlayingPresetId(preset.id)}
                      onStop={() => setPlayingPresetId(null)}
                      deleting={deletingId === preset.id}
                      onDelete={() => void handleDelete(preset)}
                    />
                  ))}
                </div>
              </section>
            ))}
          </div>
        )}

        {message ? (
          <div className="border-t border-neutral-200 px-5 py-4">
            <p className="text-sm font-medium text-emerald-700" role="status">
              {message}
            </p>
          </div>
        ) : null}

        {error ? (
          <div className="border-t border-neutral-200 px-5 py-4">
            <p className="text-sm font-medium text-red-700" role="alert">
              {error}
            </p>
          </div>
        ) : null}
      </Panel>
    </div>
  );
}
