"use client";

import type { VideoPreset } from "@/lib/video-presets/types";

function SelectedCheckmarkBadge() {
  return (
    <span
      className="absolute right-2 top-2 z-20 flex h-6 w-6 items-center justify-center rounded-full bg-blue-600 text-white shadow-md"
      aria-hidden
    >
      <svg
        viewBox="0 0 24 24"
        className="h-3.5 w-3.5"
        fill="none"
        stroke="currentColor"
        strokeWidth="3"
      >
        <path
          d="M5 13l4 4L19 7"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      </svg>
    </span>
  );
}

export function PresetVideoThumbnail({
  preset,
  isPlaying,
  isSelected = false,
  disabled = false,
  onPlay,
  onStop,
  onSelect,
}: {
  preset: VideoPreset;
  isPlaying: boolean;
  isSelected?: boolean;
  disabled?: boolean;
  onPlay: () => void;
  onStop: () => void;
  onSelect?: () => void;
}) {
  return (
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
          {onSelect ? (
            <button
              type="button"
              disabled={disabled}
              aria-pressed={isSelected}
              aria-label={`Select ${preset.label}`}
              onClick={onSelect}
              className="absolute inset-0 z-0 h-full w-full disabled:cursor-not-allowed"
            >
              <img
                src={preset.thumbnail_url}
                alt=""
                className="h-full w-full object-cover"
              />
            </button>
          ) : (
            <img
              src={preset.thumbnail_url}
              alt={preset.label}
              className="h-full w-full object-cover"
            />
          )}

          <button
            type="button"
            aria-label={`Preview ${preset.label}`}
            disabled={disabled}
            onClick={(event) => {
              event.preventDefault();
              event.stopPropagation();
              onPlay();
            }}
            className="absolute left-1/2 top-1/2 z-10 flex -translate-x-1/2 -translate-y-1/2 items-center justify-center disabled:cursor-not-allowed disabled:opacity-60"
          >
            <span className="flex h-10 w-10 items-center justify-center rounded-full bg-white/95 text-neutral-900 shadow-md transition hover:scale-105">
              <svg
                viewBox="0 0 24 24"
                aria-hidden
                className="ml-0.5 h-4 w-4 fill-current"
              >
                <path d="M8 5v14l11-7z" />
              </svg>
            </span>
          </button>

          {isSelected ? <SelectedCheckmarkBadge /> : null}
        </>
      )}
    </div>
  );
}
