import sharp from "sharp";
import { existsSync } from "node:fs";
import { resolve } from "node:path";

const defaultInput =
  "/mnt/user-data/uploads/Screenshot_2026-06-04_at_9_37_58_PM.png";
const desktopInput =
  "/Users/maynormonterrosa/Desktop/Screenshot 2026-06-04 at 9.37.58 PM.jpg";

const input = process.argv[2] ?? defaultInput;
const output = resolve(process.cwd(), "public/logo.png");

const candidates = [input, desktopInput, resolve(process.cwd(), "public/logo.png")];
const source = candidates.find((path) => existsSync(path));

if (!source) {
  console.error("No logo source found. Tried:", candidates.join(", "));
  process.exit(1);
}

console.log(`Processing: ${source}`);

const { data, info } = await sharp(source)
  .ensureAlpha()
  .raw()
  .toBuffer({ resolveWithObject: true });

for (let i = 0; i < data.length; i += 4) {
  const r = data[i];
  const g = data[i + 1];
  const b = data[i + 2];
  const luminance = 0.2126 * r + 0.7152 * g + 0.0722 * b;

  // Dark background (incl. JPEG grays) → transparent; light marks → black.
  const bgCutoff = 55;
  const fgFull = 200;

  if (luminance < bgCutoff) {
    data[i + 3] = 0;
  } else if (luminance < fgFull) {
    data[i + 3] = Math.round(
      ((luminance - bgCutoff) / (fgFull - bgCutoff)) * 255,
    );
  } else {
    data[i + 3] = 255;
  }

  data[i] = 0;
  data[i + 1] = 0;
  data[i + 2] = 0;
}

await sharp(data, {
  raw: { width: info.width, height: info.height, channels: 4 },
})
  .trim()
  .png()
  .toFile(output);

const trimmed = await sharp(output).metadata();
console.log(
  `Wrote transparent logo to ${output} (${trimmed.width}x${trimmed.height})`,
);
