import { NextResponse } from "next/server";

import {
  countImageSequencesForIndustry,
  createImageSequence,
  listImageSequences,
} from "@/lib/image-sequences/queries";
import { extractAndUploadImageSequence } from "@/lib/image-sequences/upload-sequence";
import { MAX_SEQUENCES_PER_INDUSTRY } from "@/lib/image-sequences/types";

export const runtime = "nodejs";
export const maxDuration = 120;

function jsonError(message: string, status: number) {
  return NextResponse.json({ error: message }, { status });
}

export async function GET(request: Request) {
  try {
    const industry = new URL(request.url).searchParams.get("industry")?.trim();
    const sequences = await listImageSequences(industry || undefined);

    return NextResponse.json({ sequences });
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

    if (!industry) {
      return jsonError("Industry is required.", 400);
    }

    if (!(zipFile instanceof File)) {
      return jsonError("ZIP file is required.", 400);
    }

    if (
      zipFile.type !== "application/zip" &&
      zipFile.type !== "application/x-zip-compressed" &&
      !zipFile.name.toLowerCase().endsWith(".zip")
    ) {
      return jsonError("Upload must be a ZIP file.", 400);
    }

    const existingCount = await countImageSequencesForIndustry(industry);
    if (existingCount >= MAX_SEQUENCES_PER_INDUSTRY) {
      return jsonError(
        `Each industry can have up to ${MAX_SEQUENCES_PER_INDUSTRY} image sequences.`,
        409,
      );
    }

    const zipBuffer = Buffer.from(await zipFile.arrayBuffer());
    const { framesUrls, thumbnailUrl } = await extractAndUploadImageSequence(
      zipBuffer,
      industry,
    );

    const sequence = await createImageSequence({
      industry,
      label: label || `Sequence ${Date.now()}`,
      framesUrls,
      thumbnailUrl,
    });

    return NextResponse.json({ sequence });
  } catch (error) {
    const message =
      error instanceof Error
        ? error.message
        : "Failed to create image sequence.";

    return jsonError(message, 500);
  }
}
