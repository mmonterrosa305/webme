import { spawnSync } from "node:child_process";
import { mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";

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

  const dir = mkdtempSync(join(tmpdir(), "webme-faststart-"));
  const inPath = join(dir, "in.mp4");
  const outPath = join(dir, "out.mp4");

  try {
    writeFileSync(inPath, input);
    const result = spawnSync(
      "ffmpeg",
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
      return null;
    }

    return readFileSync(outPath);
  } catch {
    return null;
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
}
