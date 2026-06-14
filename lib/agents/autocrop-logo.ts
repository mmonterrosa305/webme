import sharp from "sharp";

export async function autocropTransparentLogo(
  base64Image: string,
): Promise<string> {
  const input = Buffer.from(base64Image, "base64");
  const trimmed = await sharp(input).trim().png().toBuffer();
  return trimmed.toString("base64");
}
