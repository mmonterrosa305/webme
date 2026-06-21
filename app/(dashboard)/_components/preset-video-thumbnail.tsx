"use client";

import type { VideoPreset } from "@/lib/video-presets/types";

export function PresetVideoThumbnail({
  preset,
  isPlaying,
  onPlay,
  onStop,
}: {
  preset: VideoPreset;
  isPlaying: boolean;
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
            onClick={(event) => {
              event.preventDefault();
              event.stopPropagation();
              onPlay();
            }}
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
  );
}
