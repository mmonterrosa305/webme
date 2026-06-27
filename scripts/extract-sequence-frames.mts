import { mkdir, writeFile } from "node:fs/promises";
import { basename, extname, join } from "node:path";

import {
  DEFAULT_EXTRACT_FPS,
  extractVideoFramesFromFile,
  FFMPEG_FRAME_SCALE,
  FFMPEG_JPEG_QUALITY,
} from "../lib/image-sequences/ffmpeg-frame-extraction";

async function main() {
  const videoPath = process.argv[2];
  const outputDir = process.argv[3];

  if (!videoPath || !outputDir) {
    console.error(
      "Usage: npx tsx scripts/extract-sequence-frames.mts <video.mp4> <output-dir>",
    );
    process.exit(1);
  }

  console.log("Extracting frames with defaults:", {
    scale: FFMPEG_FRAME_SCALE,
    jpegQuality: FFMPEG_JPEG_QUALITY,
    fps: DEFAULT_EXTRACT_FPS,
  });

  const frames = await extractVideoFramesFromFile(videoPath);
  await mkdir(outputDir, { recursive: true });

  for (let index = 0; index < frames.length; index++) {
    const paddedIndex = String(index + 1).padStart(4, "0");
    const outputPath = join(
      outputDir,
      `${basename(videoPath, extname(videoPath))}-frame-${paddedIndex}.jpg`,
    );
    await writeFile(outputPath, frames[index]);
  }

  console.log(`Wrote ${frames.length} frames to ${outputDir}`);
}

void main();
