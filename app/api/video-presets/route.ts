import { NextResponse } from "next/server";

import {
  countVideoPresetsForIndustry,
  createVideoPreset,
  listVideoPresets,
} from "@/lib/video-presets/queries";
import { MAX_PRESETS_PER_INDUSTRY } from "@/lib/video-presets/types";
import {
  uploadPresetThumbnail,
  uploadPresetVideo,
  validatePresetThumbnailFile,
  validatePresetVideoFile,
} from "@/lib/video-presets/upload-preset";

export const runtime = "nodejs";
export const maxDuration = 120;

function jsonError(message: string, status: number) {
  return NextResponse.json({ error: message }, { status });
}

export async function GET(request: Request) {
  try {
    const industry = new URL(request.url).searchParams.get("industry")?.trim();

    const presets = await listVideoPresets(industry || undefined);

    return NextResponse.json({ presets });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Failed to load video presets.";

    return jsonError(message, 500);
  }
}

export async function POST(request: Request) {
  try {
    let formData: FormData;

    try {
      formData = await request.formData();
    } catch {
      return jsonError(
        "Could not read the upload. The file may be too large (max 50 MB).",
        413,
      );
    }

    const industry =
      typeof formData.get("industry") === "string"
        ? formData.get("industry")!.toString().trim()
        : "";
    const label =
      typeof formData.get("label") === "string"
        ? formData.get("label")!.toString().trim()
        : "";
    const videoFile = formData.get("video");
    const thumbnailFile = formData.get("thumbnail");

    if (!industry) {
      return jsonError("Industry is required.", 400);
    }

    if (!(videoFile instanceof File) || videoFile.size === 0) {
      return jsonError("Video file is required.", 400);
    }

    const videoValidationError = validatePresetVideoFile(videoFile);
    if (videoValidationError) {
      const status = videoValidationError.includes("50 MB") ? 413 : 400;
      return jsonError(videoValidationError, status);
    }

    if (thumbnailFile instanceof File && thumbnailFile.size > 0) {
      const thumbnailValidationError = validatePresetThumbnailFile(thumbnailFile);
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

    const videoUrl = await uploadPresetVideo(videoFile, industry);

    let thumbnailUrl = "";
    if (thumbnailFile instanceof File && thumbnailFile.size > 0) {
      thumbnailUrl = await uploadPresetThumbnail(thumbnailFile, industry);
    } else {
      thumbnailUrl = videoUrl;
    }

    const preset = await createVideoPreset({
      industry,
      label: label || `Option ${Date.now()}`,
      videoUrl,
      thumbnailUrl,
    });

    return NextResponse.json({ preset });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Failed to create video preset.";

    return jsonError(message, 500);
  }
}
