import { spawnSync } from "node:child_process";
import { mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import ffmpegPath from "ffmpeg-static";

/**
 * Re-mux an MP4 so the moov atom is at the start (progressive / web playback).
 * Returns null when ffmpeg is unavailable or remux fails.
 */
export function ensureMp4FastStart(input: Buffer): Buffer | null {
  if (input.length < 16) {
    return null;
  }

  // Already starts with ftyp…moov (common after a prior faststart pass).
  if (
    input.slice(4, 8).toString("latin1") === "ftyp" &&
    input.slice(36, 40).toString("latin1") === "moov"
  ) {
    return input;
  }

  if (!ffmpegPath) {
    console.error(
      "[ensureMp4FastStart] ffmpeg-static binary path is unavailable",
    );
    return null;
  }

  const dir = mkdtempSync(join(tmpdir(), "webme-faststart-"));
  const inPath = join(dir, "in.mp4");
  const outPath = join(dir, "out.mp4");

  try {
    writeFileSync(inPath, input);
    const result = spawnSync(
      ffmpegPath,
      [
        "-y",
        "-i",
        inPath,
        "-c:v",
        "copy",
        "-an",
        "-movflags",
        "+faststart",
        outPath,
      ],
      { encoding: "utf8" },
    );

    if (result.status !== 0) {
      console.error("[ensureMp4FastStart] ffmpeg remux failed", {
        status: result.status,
        error: result.error?.message,
        stderr: result.stderr?.slice(-2000),
      });
      return null;
    }

    return readFileSync(outPath);
  } catch (error) {
    console.error("[ensureMp4FastStart] unexpected error", error);
    return null;
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
}
