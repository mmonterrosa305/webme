import { NextResponse } from "next/server";

import {
  createVideoPreset,
  listVideoPresets,
} from "@/lib/video-presets/queries";
import {
  uploadPresetThumbnail,
  uploadPresetVideo,
} from "@/lib/video-presets/upload-preset";

export async function GET(request: Request) {
  try {
    const industry = new URL(request.url).searchParams.get("industry")?.trim();

    const presets = await listVideoPresets(industry || undefined);

    return NextResponse.json({ presets });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Failed to load video presets.";

    return NextResponse.json({ error: message }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const formData = await request.formData();
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
      return NextResponse.json(
        { error: "Industry is required." },
        { status: 400 },
      );
    }

    if (!(videoFile instanceof File) || videoFile.size === 0) {
      return NextResponse.json(
        { error: "Video file is required." },
        { status: 400 },
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

    return NextResponse.json({ error: message }, { status: 500 });
  }
}
