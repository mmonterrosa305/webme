"use client";

import type { VideoPreset } from "@/lib/video-presets/types";

export function PresetVideoThumbnail({
  preset,
  isPlaying,
  disabled = false,
  onPlay,
  onStop,
}: {
  preset: VideoPreset;
  isPlaying: boolean;
  disabled?: boolean;
  onPlay: () => void;
  onStop: () => void;
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
          <img
            src={preset.thumbnail_url}
            alt={preset.label}
            className="h-full w-full object-cover"
          />

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
        </>
      )}
    </div>
  );
}
