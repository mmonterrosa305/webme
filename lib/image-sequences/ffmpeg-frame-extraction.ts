import { execFile } from "node:child_process";
import { mkdtemp, readdir, readFile, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { promisify } from "node:util";

/** Default ffmpeg scale filter: 1920px wide, preserve aspect ratio. */
export const FFMPEG_FRAME_SCALE = "1920:-1";

/** Default ffmpeg JPEG quality (-q:v 1 is maximum quality). */
export const FFMPEG_JPEG_QUALITY = 1;

export const DEFAULT_EXTRACT_FPS = 24;

const execFileAsync = promisify(execFile);

function naturalSort(a: string, b: string): number {
  return a.localeCompare(b, undefined, { numeric: true, sensitivity: "base" });
}

export type ExtractVideoFramesOptions = {
  fps?: number;
  scale?: string;
  jpegQuality?: number;
  maxFrames?: number;
};

function buildFfmpegExtractArgs(
  videoPath: string,
  outputPattern: string,
  options: ExtractVideoFramesOptions = {},
): string[] {
  const scale = options.scale ?? FFMPEG_FRAME_SCALE;
  const jpegQuality = options.jpegQuality ?? FFMPEG_JPEG_QUALITY;
  const fps = options.fps ?? DEFAULT_EXTRACT_FPS;

  const args = [
    "-hide_banner",
    "-loglevel",
    "error",
    "-i",
    videoPath,
    "-vf",
    `fps=${fps},scale=${scale}`,
    "-q:v",
    String(jpegQuality),
  ];

  if (options.maxFrames !== undefined) {
    args.push("-frames:v", String(options.maxFrames));
  }

  args.push(outputPattern);
  return args;
}

export async function extractVideoFramesFromFile(
  videoPath: string,
  options: ExtractVideoFramesOptions = {},
): Promise<Buffer[]> {
  const outputDir = await mkdtemp(join(tmpdir(), "webme-seq-frames-"));

  try {
    const outputPattern = join(outputDir, "frame-%04d.jpg");
    await execFileAsync("ffmpeg", buildFfmpegExtractArgs(videoPath, outputPattern, options), {
      maxBuffer: 50 * 1024 * 1024,
    });

    const files = (await readdir(outputDir))
      .filter((name) => /^frame-\d+\.jpg$/i.test(name))
      .sort((a, b) => naturalSort(a, b));

    const buffers: Buffer[] = [];
    for (const file of files) {
      buffers.push(await readFile(join(outputDir, file)));
    }

    return buffers;
  } finally {
    await rm(outputDir, { recursive: true, force: true });
  }
}

export async function extractVideoFramesFromBuffer(
  videoBuffer: Buffer,
  extension: string,
  options: ExtractVideoFramesOptions = {},
): Promise<Buffer[]> {
  const tempDir = await mkdtemp(join(tmpdir(), "webme-seq-video-"));
  const videoPath = join(tempDir, `input${extension}`);

  try {
    await writeFile(videoPath, videoBuffer);
    return await extractVideoFramesFromFile(videoPath, options);
  } finally {
    await rm(tempDir, { recursive: true, force: true });
  }
}
