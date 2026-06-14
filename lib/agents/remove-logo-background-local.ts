import sharp from "sharp";

function colorDistance(
  r1: number,
  g1: number,
  b1: number,
  r2: number,
  g2: number,
  b2: number,
): number {
  return Math.sqrt(
    (r1 - r2) ** 2 + (g1 - g2) ** 2 + (b1 - b2) ** 2,
  );
}

function sampleBackgroundColor(
  data: Buffer,
  width: number,
  height: number,
): [number, number, number] {
  const samples: [number, number, number][] = [];
  const points: [number, number][] = [
    [0, 0],
    [width - 1, 0],
    [0, height - 1],
    [width - 1, height - 1],
    [Math.floor(width / 2), 0],
    [Math.floor(width / 2), height - 1],
    [0, Math.floor(height / 2)],
    [width - 1, Math.floor(height / 2)],
  ];

  for (const [x, y] of points) {
    const index = (y * width + x) * 4;
    samples.push([data[index], data[index + 1], data[index + 2]]);
  }

  const avg: [number, number, number] = [0, 0, 0];
  for (const [r, g, b] of samples) {
    avg[0] += r;
    avg[1] += g;
    avg[2] += b;
  }

  const count = samples.length;
  return [
    Math.round(avg[0] / count),
    Math.round(avg[1] / count),
    Math.round(avg[2] / count),
  ];
}

export async function removeLogoBackgroundLocally(
  base64Image: string,
  mediaType: string,
): Promise<{ base64: string; mediaType: string } | null> {
  try {
    const input = Buffer.from(base64Image, "base64");
    const { data, info } = await sharp(input, { animated: false })
      .ensureAlpha()
      .raw()
      .toBuffer({ resolveWithObject: true });

    const [bgR, bgG, bgB] = sampleBackgroundColor(
      data,
      info.width,
      info.height,
    );
    const bgLuminance = 0.2126 * bgR + 0.7152 * bgG + 0.0722 * bgB;

    const hardThreshold = bgLuminance < 90 ? 45 : 35;
    const softThreshold = hardThreshold + 40;

    for (let i = 0; i < data.length; i += 4) {
      const r = data[i];
      const g = data[i + 1];
      const b = data[i + 2];
      const distance = colorDistance(r, g, b, bgR, bgG, bgB);

      if (distance <= hardThreshold) {
        data[i + 3] = 0;
        continue;
      }

      if (distance <= softThreshold) {
        const alpha = Math.round(
          ((distance - hardThreshold) / (softThreshold - hardThreshold)) *
            255,
        );
        data[i + 3] = Math.min(data[i + 3], alpha);
      }
    }

    const pngBuffer = await sharp(data, {
      raw: { width: info.width, height: info.height, channels: 4 },
    })
      .png()
      .toBuffer();

    return {
      base64: pngBuffer.toString("base64"),
      mediaType: "image/png",
    };
  } catch (error) {
    console.error(
      "[remove-bg] Local fallback failed:",
      error instanceof Error ? error.message : error,
    );
    return null;
  }
}
