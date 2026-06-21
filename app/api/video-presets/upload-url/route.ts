import { NextResponse } from "next/server";

import { countVideoPresetsForIndustry } from "@/lib/video-presets/queries";
import { MAX_PRESETS_PER_INDUSTRY } from "@/lib/video-presets/types";
import {
  buildPresetThumbnailObjectPath,
  buildPresetVideoObjectPath,
  createSignedPresetUploadTarget,
  logVideoPreset,
  logVideoPresetError,
  validatePresetThumbnailMetadata,
  validatePresetVideoMetadata,
  type PresetFileMetadata,
} from "@/lib/video-presets/upload-preset";

export const runtime = "nodejs";

function jsonError(message: string, status: number) {
  return NextResponse.json({ error: message }, { status });
}

function parseFileMetadata(value: unknown): PresetFileMetadata | null {
  if (!value || typeof value !== "object") {
    return null;
  }

  const record = value as Record<string, unknown>;
  const name = typeof record.name === "string" ? record.name.trim() : "";
  const size = typeof record.size === "number" ? record.size : Number(record.size);
  const type = typeof record.type === "string" ? record.type.trim() : "";

  if (!name || !Number.isFinite(size) || !type) {
    return null;
  }

  return { name, size, type };
}

export async function POST(request: Request) {
  const startedAt = Date.now();

  try {
    const body = (await request.json()) as {
      industry?: unknown;
      video?: unknown;
      thumbnail?: unknown;
    };

    const industry =
      typeof body.industry === "string" ? body.industry.trim() : "";
    const video = parseFileMetadata(body.video);
    const thumbnail = parseFileMetadata(body.thumbnail);

    logVideoPreset("upload-url:start", {
      industry,
      videoSize: video?.size,
      videoType: video?.type,
      hasThumbnail: Boolean(thumbnail),
    });

    if (!industry) {
      return jsonError("Industry is required.", 400);
    }

    if (!video) {
      return jsonError("Video metadata is required.", 400);
    }

    const videoValidationError = validatePresetVideoMetadata(video);
    if (videoValidationError) {
      const status = videoValidationError.includes("50 MB") ? 413 : 400;
      return jsonError(videoValidationError, status);
    }

    if (thumbnail) {
      const thumbnailValidationError = validatePresetThumbnailMetadata(thumbnail);
      if (thumbnailValidationError) {
        return jsonError(thumbnailValidationError, 400);
      }
    }

    const existingCount = await countVideoPresetsForIndustry(industry);
    if (existingCount >= MAX_PRESETS_PER_INDUSTRY) {
      return jsonError(
        `Each industry can have up to ${MAX_PRESETS_PER_INDUSTRY} preset videos.`,
        409,
      );
    }

    const videoPath = buildPresetVideoObjectPath(industry, video.name);
    const videoTarget = await createSignedPresetUploadTarget(videoPath);

    let thumbnailTarget = null;
    if (thumbnail) {
      const thumbnailPath = buildPresetThumbnailObjectPath(
        industry,
        thumbnail.type,
      );
      thumbnailTarget = await createSignedPresetUploadTarget(thumbnailPath);
    }

    logVideoPreset("upload-url:ready", {
      industry,
      videoPath: videoTarget.path,
      thumbnailPath: thumbnailTarget?.path ?? null,
      durationMs: Date.now() - startedAt,
    });

    return NextResponse.json({
      video: videoTarget,
      thumbnail: thumbnailTarget,
    });
  } catch (error) {
    logVideoPresetError("upload-url:failed", error, {
      durationMs: Date.now() - startedAt,
    });

    const message =
      error instanceof Error
        ? error.message
        : "Failed to prepare video upload.";

    return jsonError(message, 500);
  }
}
