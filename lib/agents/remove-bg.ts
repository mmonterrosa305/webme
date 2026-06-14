import { autocropTransparentLogo } from "@/lib/agents/autocrop-logo";
import { removeLogoBackgroundLocally } from "@/lib/agents/remove-logo-background-local";

export type BackgroundRemovalResult = {
  base64: string;
  mediaType: string;
  source: "remove.bg" | "sharp";
};

const PLACEHOLDER_API_KEYS = new Set([
  "",
  "your_key_here",
  "your-api-key",
  "replace_me",
]);

function isValidRemoveBgApiKey(apiKey: string | undefined): apiKey is string {
  if (!apiKey) {
    return false;
  }

  const trimmed = apiKey.trim();
  return trimmed.length > 0 && !PLACEHOLDER_API_KEYS.has(trimmed);
}

async function removeBackgroundWithRemoveBg(
  base64Image: string,
  apiKey: string,
): Promise<BackgroundRemovalResult | null> {
  const formData = new FormData();
  formData.append("image_file_b64", base64Image);
  formData.append("size", "auto");
  formData.append("format", "png");

  const response = await fetch("https://api.remove.bg/v1.0/removebg", {
    method: "POST",
    headers: {
      "X-Api-Key": apiKey,
    },
    body: formData,
  });

  console.log("[remove-bg] Response status:", response.status);

  if (!response.ok) {
    console.error(
      "[remove-bg] API error:",
      response.status,
      await response.text(),
    );
    return null;
  }

  const arrayBuffer = await response.arrayBuffer();
  const resultBase64 = Buffer.from(arrayBuffer).toString("base64");

  console.log(
    "[remove-bg] Success, result base64 length:",
    resultBase64.length,
  );

  return {
    base64: resultBase64,
    mediaType: "image/png",
    source: "remove.bg",
  };
}

async function autocropLogoResult(
  result: BackgroundRemovalResult,
): Promise<BackgroundRemovalResult> {
  try {
    const trimmedBase64 = await autocropTransparentLogo(result.base64);
    console.log(
      "[remove-bg] Autocrop succeeded, base64 length:",
      trimmedBase64.length,
    );
    return {
      ...result,
      base64: trimmedBase64,
      mediaType: "image/png",
    };
  } catch (error) {
    console.error(
      "[remove-bg] Autocrop failed, using untrimmed logo:",
      error instanceof Error ? error.message : error,
    );
    return result;
  }
}

export async function removeBackground(
  base64Image: string,
  mediaType: string,
): Promise<BackgroundRemovalResult | null> {
  console.log(
    "[remove-bg] Starting background removal, mediaType:",
    mediaType,
    "base64 length:",
    base64Image.length,
  );

  const apiKey = process.env.REMOVE_BG_API_KEY?.trim();

  if (isValidRemoveBgApiKey(apiKey)) {
    try {
      const apiResult = await removeBackgroundWithRemoveBg(base64Image, apiKey);
      if (apiResult) {
        return autocropLogoResult(apiResult);
      }

      console.log(
        "[remove-bg] remove.bg failed, trying local sharp fallback",
      );
    } catch (error) {
      console.error(
        "[remove-bg] remove.bg request failed:",
        error instanceof Error ? error.message : error,
      );
      console.log(
        "[remove-bg] remove.bg threw, trying local sharp fallback",
      );
    }
  } else {
    console.log(
      "[remove-bg] Skipping remove.bg - missing or placeholder API key, using local sharp fallback",
    );
  }

  const localResult = await removeLogoBackgroundLocally(base64Image, mediaType);
  if (localResult) {
    console.log(
      "[remove-bg] Local sharp fallback succeeded, result base64 length:",
      localResult.base64.length,
    );
    return autocropLogoResult({
      ...localResult,
      source: "sharp",
    });
  }

  console.log("[remove-bg] Failed, all background removal methods exhausted");
  return null;
}
