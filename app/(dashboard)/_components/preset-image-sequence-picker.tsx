"use client";

import { useEffect, useId, useState } from "react";

import type { ImageSequencePreset } from "@/lib/image-sequences/types";

function SequencePreview({
  sequence,
  isPlaying,
  disabled,
  onPlay,
  onStop,
}: {
  sequence: ImageSequencePreset;
  isPlaying: boolean;
  disabled?: boolean;
  onPlay: () => void;
  onStop: () => void;
}) {
  const [frameIndex, setFrameIndex] = useState(0);

  useEffect(() => {
    if (!isPlaying || sequence.frames_urls.length <= 1) {
      return;
    }

    const interval = window.setInterval(() => {
      setFrameIndex((current) => (current + 1) % sequence.frames_urls.length);
    }, 100);

    return () => window.clearInterval(interval);
  }, [isPlaying, sequence.frames_urls.length]);

  useEffect(() => {
    if (!isPlaying) {
      setFrameIndex(0);
    }
  }, [isPlaying]);

  const previewUrl =
    sequence.frames_urls[frameIndex] ?? sequence.thumbnail_url;

  return (
    <div className="relative aspect-video bg-neutral-900">
      <img
        src={previewUrl}
        alt={sequence.label}
        className="h-full w-full object-cover"
      />

      <button
        type="button"
        aria-label={`Preview ${sequence.label}`}
        disabled={disabled}
        onClick={(event) => {
          event.preventDefault();
          event.stopPropagation();
          if (isPlaying) {
            onStop();
          } else {
            onPlay();
          }
        }}
        className="absolute left-1/2 top-1/2 z-10 flex -translate-x-1/2 -translate-y-1/2 items-center justify-center disabled:cursor-not-allowed disabled:opacity-60"
      >
        <span className="flex h-10 w-10 items-center justify-center rounded-full bg-white/95 text-neutral-900 shadow-md transition hover:scale-105">
          {isPlaying ? (
            <svg viewBox="0 0 24 24" aria-hidden className="h-4 w-4 fill-current">
              <path d="M6 5h4v14H6V5zm8 0h4v14h-4V5z" />
            </svg>
          ) : (
            <svg
              viewBox="0 0 24 24"
              aria-hidden
              className="ml-0.5 h-4 w-4 fill-current"
            >
              <path d="M8 5v14l11-7z" />
            </svg>
          )}
        </span>
      </button>
    </div>
  );
}

export function PresetImageSequencePicker({
  industry,
  selectedSequenceId,
  onSelectedSequenceIdChange,
  disabled = false,
  enabled = true,
  showAutoSelect = false,
  gridClassName = "grid gap-3 sm:grid-cols-2 lg:grid-cols-4",
}: {
  industry?: string;
  selectedSequenceId: string | null;
  onSelectedSequenceIdChange: (sequenceId: string | null) => void;
  disabled?: boolean;
  enabled?: boolean;
  showAutoSelect?: boolean;
  gridClassName?: string;
}) {
  const [sequences, setSequences] = useState<ImageSequencePreset[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [playingSequenceId, setPlayingSequenceId] = useState<string | null>(
    null,
  );
  const groupName = useId();

  useEffect(() => {
    if (!enabled) {
      return;
    }

    let cancelled = false;

    async function loadSequences() {
      setLoading(true);
      setError(null);

      try {
        const query = industry
          ? `?industry=${encodeURIComponent(industry)}`
          : "";
        const response = await fetch(`/api/image-sequences${query}`, {
          cache: "no-store",
        });
        const data = (await response.json()) as {
          sequences?: ImageSequencePreset[];
          error?: string;
        };

        if (!response.ok) {
          throw new Error(data.error ?? "Failed to load image sequences.");
        }

        if (!cancelled) {
          setSequences(data.sequences ?? []);
        }
      } catch (loadError) {
        if (!cancelled) {
          setError(
            loadError instanceof Error
              ? loadError.message
              : "Failed to load image sequences.",
          );
          setSequences([]);
        }
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    }

    void loadSequences();

    return () => {
      cancelled = true;
    };
  }, [enabled, industry]);

  useEffect(() => {
    if (
      playingSequenceId &&
      !sequences.some((sequence) => sequence.id === playingSequenceId)
    ) {
      setPlayingSequenceId(null);
    }
  }, [playingSequenceId, sequences]);

  if (!enabled) {
    return null;
  }

  if (loading) {
    return <p className="text-sm text-neutral-600">Loading sequences...</p>;
  }

  if (error) {
    return (
      <p className="text-sm text-red-600" role="alert">
        {error}
      </p>
    );
  }

  if (sequences.length === 0) {
    return (
      <p className="text-sm text-neutral-600">
        No image sequences for this industry yet.
      </p>
    );
  }

  return (
    <div
      role="radiogroup"
      aria-label="Image sequence selection"
      className="space-y-3"
    >
      {showAutoSelect ? (
        <label className="flex cursor-pointer items-center gap-2 text-sm text-neutral-700">
          <input
            type="radio"
            name={groupName}
            checked={selectedSequenceId === null}
            onChange={() => onSelectedSequenceIdChange(null)}
            disabled={disabled}
            className="h-4 w-4 border-neutral-300 text-neutral-900 focus:ring-neutral-900"
          />
          Auto-select from Pexels video (default)
        </label>
      ) : null}

      <div className={gridClassName}>
        {sequences.map((sequence) => {
          const isSelected = selectedSequenceId === sequence.id;

          return (
            <div
              key={sequence.id}
              className={`overflow-hidden rounded-lg border bg-white ${
                isSelected ? "border-blue-600" : "border-neutral-200"
              } ${disabled ? "opacity-60" : ""}`}
            >
              <SequencePreview
                sequence={sequence}
                isPlaying={playingSequenceId === sequence.id}
                disabled={disabled}
                onPlay={() => setPlayingSequenceId(sequence.id)}
                onStop={() => setPlayingSequenceId(null)}
              />
              <div className="px-3 py-2.5">
                <p className="text-sm font-medium text-neutral-900">
                  {sequence.label}
                </p>
                <p className="mt-0.5 text-xs text-neutral-500">
                  {sequence.frame_count} frames
                  {!industry ? ` · ${sequence.industry}` : ""}
                </p>
                <label className="mt-2 flex cursor-pointer items-center gap-2">
                  <input
                    type="radio"
                    name={groupName}
                    value={sequence.id}
                    checked={isSelected}
                    onChange={() => onSelectedSequenceIdChange(sequence.id)}
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
