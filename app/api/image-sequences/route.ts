import { NextResponse } from "next/server";

import {
  ALLOWED_SCROLL_HERO_VIDEO_TYPES,
  MAX_SCROLL_HERO_VIDEO_BYTES,
} from "@/lib/agents/scroll-hero-video-shared";
import {
  countImageSequencesForIndustry,
  createImageSequence,
  getImageSequenceById,
  listImageSequences,
} from "@/lib/image-sequences/queries";
import {
  extractAndUploadImageSequence,
  extractAndUploadImageSequenceFromVideo,
} from "@/lib/image-sequences/upload-sequence";
import { MAX_SEQUENCES_PER_INDUSTRY } from "@/lib/image-sequences/types";

export const runtime = "nodejs";
export const maxDuration = 120;
export const dynamic = "force-dynamic";

function jsonError(message: string, status: number) {
  return NextResponse.json(
    { error: message },
    {
      status,
      headers: {
        "Cache-Control": "no-store, no-cache, must-revalidate",
      },
    },
  );
}

function jsonOk(body: Record<string, unknown>, status = 200) {
  return NextResponse.json(body, {
    status,
    headers: {
      "Cache-Control": "no-store, no-cache, must-revalidate",
    },
  });
}

export async function GET(request: Request) {
  try {
    const industry = new URL(request.url).searchParams.get("industry")?.trim();
    const sequences = await listImageSequences(industry || undefined);

    console.log("[image-sequences GET]", {
      industryFilter: industry || null,
      count: sequences.length,
      sequences: sequences.map((sequence) => ({
        id: sequence.id,
        industry: sequence.industry,
        label: sequence.label,
        frame_count: sequence.frame_count,
        created_at: sequence.created_at,
      })),
    });

    return jsonOk({ sequences });
  } catch (error) {
    const message =
      error instanceof Error
        ? error.message
        : "Failed to load image sequences.";

    return jsonError(message, 500);
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
    const zipFile = formData.get("zipFile");
    const videoFile = formData.get("videoFile");

    if (!industry) {
      return jsonError("Industry is required.", 400);
    }

    const hasZip = zipFile instanceof File;
    const hasVideo = videoFile instanceof File;

    if (!hasZip && !hasVideo) {
      return jsonError("ZIP file or video file is required.", 400);
    }

    if (hasZip && hasVideo) {
      return jsonError("Upload either a ZIP or a video file, not both.", 400);
    }

    if (hasZip) {
      if (
        zipFile.type !== "application/zip" &&
        zipFile.type !== "application/x-zip-compressed" &&
        !zipFile.name.toLowerCase().endsWith(".zip")
      ) {
        return jsonError("Upload must be a ZIP file.", 400);
      }
    }

    if (hasVideo) {
      if (!ALLOWED_SCROLL_HERO_VIDEO_TYPES.has(videoFile.type)) {
        return jsonError("Only MP4, WebM, or MOV videos are supported.", 400);
      }

      if (videoFile.size > MAX_SCROLL_HERO_VIDEO_BYTES) {
        return jsonError("Video must be 50 MB or smaller.", 400);
      }
    }

    const existingCount = await countImageSequencesForIndustry(industry);
    if (existingCount >= MAX_SEQUENCES_PER_INDUSTRY) {
      return jsonError(
        `Each industry can have up to ${MAX_SEQUENCES_PER_INDUSTRY} image sequences.`,
        409,
      );
    }

    let framesUrls: string[];
    let thumbnailUrl: string;

    if (hasVideo && videoFile instanceof File) {
      ({ framesUrls, thumbnailUrl } = await extractAndUploadImageSequenceFromVideo(
        Buffer.from(await videoFile.arrayBuffer()),
        industry,
        videoFile.name,
      ));
    } else if (hasZip && zipFile instanceof File) {
      ({ framesUrls, thumbnailUrl } = await extractAndUploadImageSequence(
        Buffer.from(await zipFile.arrayBuffer()),
        industry,
      ));
    } else {
      return jsonError("ZIP file or video file is required.", 400);
    }

    const sequence = await createImageSequence({
      industry,
      label: label || `Sequence ${Date.now()}`,
      framesUrls,
      thumbnailUrl,
    });

    const verified = await getImageSequenceById(sequence.id);
    if (!verified) {
      console.error("[image-sequences POST] Insert verification failed", {
        industry,
        sequenceId: sequence.id,
      });
      return jsonError(
        "Image sequence was uploaded but could not be saved. Try again.",
        500,
      );
    }

    console.log("[image-sequences POST] Saved sequence", {
      id: verified.id,
      industry: verified.industry,
      label: verified.label,
      frame_count: verified.frame_count,
    });

    return jsonOk({ sequence: verified });
  } catch (error) {
    const message =
      error instanceof Error
        ? error.message
        : "Failed to create image sequence.";

    return jsonError(message, 500);
  }
}
