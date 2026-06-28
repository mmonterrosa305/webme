import JSZip from "jszip";

import { createAdminClient } from "@/lib/supabase/admin";
import { getSupabaseUrl } from "@/lib/supabase/env";
import { slugifyIndustry } from "@/lib/video-presets/upload-preset";

import { extractVideoFramesFromBuffer } from "./ffmpeg-frame-extraction";
import {
  MAX_SEQUENCE_FRAMES,
  MAX_SEQUENCE_ZIP_BYTES,
  MIN_SEQUENCE_FRAMES,
  SEQUENCE_STORAGE_BUCKET,
} from "./types";

const FRAME_FILE_PATTERN = /\.(jpe?g|png|webp)$/i;

type FrameExtension = ".jpg" | ".png" | ".webp";

function naturalSort(a: string, b: string): number {
  return a.localeCompare(b, undefined, { numeric: true, sensitivity: "base" });
}

function getPublicStorageUrl(objectPath: string): string {
  const supabase = createAdminClient();
  const { data } = supabase.storage
    .from(SEQUENCE_STORAGE_BUCKET)
    .getPublicUrl(objectPath);
  let url = data.publicUrl;
  const baseUrl = getSupabaseUrl();

  if (!url.startsWith("http")) {
    url = `${baseUrl}/storage/v1/object/public/${SEQUENCE_STORAGE_BUCKET}/${objectPath}`;
  }

  return url;
}

function frameContentType(extension: FrameExtension): string {
  if (extension === ".png") {
    return "image/png";
  }
  if (extension === ".webp") {
    return "image/webp";
  }
  return "image/jpeg";
}

function extensionFromFileName(fileName: string): FrameExtension | null {
  if (/\.png$/i.test(fileName)) {
    return ".png";
  }
  if (/\.webp$/i.test(fileName)) {
    return ".webp";
  }
  if (/\.jpe?g$/i.test(fileName)) {
    return ".jpg";
  }
  return null;
}

async function uploadFrameBuffers(
  frameBuffers: Buffer[],
  industry: string,
  extension: FrameExtension = ".webp",
): Promise<{ framesUrls: string[]; thumbnailUrl: string }> {
  const industrySlug = slugifyIndustry(industry) || "industry";
  const sequencePrefix = `hero-sequences/presets/${industrySlug}/${Date.now()}`;
  const supabase = createAdminClient();
  const framesUrls: string[] = [];
  const contentType = frameContentType(extension);

  for (let index = 0; index < frameBuffers.length; index++) {
    const frameBuffer = frameBuffers[index];
    const paddedIndex = String(index + 1).padStart(4, "0");
    const objectPath = `${sequencePrefix}/frame-${paddedIndex}${extension}`;

    const { error: uploadError } = await supabase.storage
      .from(SEQUENCE_STORAGE_BUCKET)
      .upload(objectPath, frameBuffer, {
        contentType,
        upsert: false,
      });

    if (uploadError) {
      throw new Error(uploadError.message);
    }

    framesUrls.push(getPublicStorageUrl(objectPath));
  }

  return {
    framesUrls,
    thumbnailUrl: framesUrls[0] ?? "",
  };
}

export async function extractAndUploadImageSequenceFromVideo(
  videoBuffer: Buffer,
  industry: string,
  fileName: string,
): Promise<{ framesUrls: string[]; thumbnailUrl: string }> {
  const extension = fileName.includes(".")
    ? fileName.slice(fileName.lastIndexOf("."))
    : ".mp4";

  const frameBuffers = await extractVideoFramesFromBuffer(videoBuffer, extension, {
    maxFrames: MAX_SEQUENCE_FRAMES,
  });

  if (frameBuffers.length < MIN_SEQUENCE_FRAMES) {
    throw new Error(
      `Video must yield at least ${MIN_SEQUENCE_FRAMES} frames after extraction.`,
    );
  }

  return uploadFrameBuffers(frameBuffers, industry, ".webp");
}

export async function extractAndUploadImageSequence(
  zipBuffer: Buffer,
  industry: string,
): Promise<{ framesUrls: string[]; thumbnailUrl: string }> {
  if (zipBuffer.byteLength > MAX_SEQUENCE_ZIP_BYTES) {
    throw new Error("ZIP file must be 200 MB or smaller.");
  }

  const zip = await JSZip.loadAsync(zipBuffer);
  const frameEntries = Object.entries(zip.files)
    .filter(([name, entry]) => !entry.dir && FRAME_FILE_PATTERN.test(name))
    .sort(([a], [b]) => naturalSort(a, b));

  if (frameEntries.length < MIN_SEQUENCE_FRAMES) {
    throw new Error(
      `ZIP must contain at least ${MIN_SEQUENCE_FRAMES} JPG, PNG, or WebP frames.`,
    );
  }

  if (frameEntries.length > MAX_SEQUENCE_FRAMES) {
    throw new Error(`ZIP can contain at most ${MAX_SEQUENCE_FRAMES} frames.`);
  }

  const frameBuffers: Buffer[] = [];
  let extension: FrameExtension = ".jpg";

  for (const [fileName, entry] of frameEntries) {
    frameBuffers.push(Buffer.from(await entry.async("nodebuffer")));
    const entryExtension = extensionFromFileName(fileName);
    if (entryExtension === ".webp") {
      extension = ".webp";
    } else if (entryExtension === ".png" && extension !== ".webp") {
      extension = ".png";
    }
  }

  return uploadFrameBuffers(frameBuffers, industry, extension);
}
