import { NextResponse } from "next/server";

import {
  countVideoPresetsForIndustry,
  createVideoPreset,
  listVideoPresets,
} from "@/lib/video-presets/queries";
import { MAX_PRESETS_PER_INDUSTRY } from "@/lib/video-presets/types";
import {
  getPresetPublicStorageUrl,
  isValidPresetThumbnailPath,
  isValidPresetVideoPath,
  logVideoPreset,
  logVideoPresetError,
  verifyPresetStorageObjectExists,
} from "@/lib/video-presets/upload-preset";

export const runtime = "nodejs";
export const maxDuration = 60;

function jsonError(message: string, status: number) {
  return NextResponse.json({ error: message }, { status });
}

export async function GET(request: Request) {
  try {
    const industry = new URL(request.url).searchParams.get("industry")?.trim();

    const presets = await listVideoPresets(industry || undefined);

    return NextResponse.json({ presets });
  } catch (error) {
    logVideoPresetError("list:failed", error);

    const message =
      error instanceof Error ? error.message : "Failed to load video presets.";

    return jsonError(message, 500);
  }
}

export async function POST(request: Request) {
  const startedAt = Date.now();

  try {
    const body = (await request.json()) as {
      industry?: unknown;
      label?: unknown;
      videoPath?: unknown;
      thumbnailPath?: unknown;
    };

    const industry =
      typeof body.industry === "string" ? body.industry.trim() : "";
    const label =
      typeof body.label === "string" ? body.label.trim() : "";
    const videoPath =
      typeof body.videoPath === "string" ? body.videoPath.trim() : "";
    const thumbnailPath =
      typeof body.thumbnailPath === "string" ? body.thumbnailPath.trim() : "";

    logVideoPreset("finalize:start", {
      industry,
      videoPath,
      thumbnailPath: thumbnailPath || null,
    });

    if (!industry) {
      return jsonError("Industry is required.", 400);
    }

    if (!videoPath || !isValidPresetVideoPath(videoPath, industry)) {
      return jsonError("Invalid video upload path.", 400);
    }

    if (thumbnailPath && !isValidPresetThumbnailPath(thumbnailPath, industry)) {
      return jsonError("Invalid thumbnail upload path.", 400);
    }

    const existingCount = await countVideoPresetsForIndustry(industry);
    if (existingCount >= MAX_PRESETS_PER_INDUSTRY) {
      return jsonError(
        `Each industry can have up to ${MAX_PRESETS_PER_INDUSTRY} preset videos.`,
        409,
      );
    }

    const videoExists = await verifyPresetStorageObjectExists(videoPath);
    if (!videoExists) {
      return jsonError(
        "Video upload was not found in storage. Try uploading again.",
        400,
      );
    }

    let thumbnailUrl = getPresetPublicStorageUrl(videoPath);

    if (thumbnailPath) {
      const thumbnailExists =
        await verifyPresetStorageObjectExists(thumbnailPath);
      if (!thumbnailExists) {
        return jsonError(
          "Thumbnail upload was not found in storage. Try uploading again.",
          400,
        );
      }

      thumbnailUrl = getPresetPublicStorageUrl(thumbnailPath);
    }

    const preset = await createVideoPreset({
      industry,
      label: label || `Option ${Date.now()}`,
      videoUrl: getPresetPublicStorageUrl(videoPath),
      thumbnailUrl,
    });

    logVideoPreset("finalize:success", {
      industry,
      presetId: preset.id,
      durationMs: Date.now() - startedAt,
    });

    return NextResponse.json({ preset });
  } catch (error) {
    logVideoPresetError("finalize:failed", error, {
      durationMs: Date.now() - startedAt,
    });

    const message =
      error instanceof Error ? error.message : "Failed to create video preset.";

    return jsonError(message, 500);
  }
}
