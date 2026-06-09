export async function removeBackground(
  base64Image: string,
  mediaType: string,
): Promise<{ base64: string; mediaType: string } | null> {
  console.log(
    "[remove-bg] Starting background removal, mediaType:",
    mediaType,
    "base64 length:",
    base64Image.length,
  );

  const apiKey = process.env.REMOVE_BG_API_KEY?.trim();
  if (!apiKey) {
    console.log("[remove-bg] Skipping - no API key");
    return null;
  }

  try {
    // Convert base64 to blob
    const binaryStr = Buffer.from(base64Image, "base64");

    const formData = new FormData();
    formData.append(
      "image_file",
      new Blob([binaryStr], { type: mediaType }),
      "logo.png",
    );
    formData.append("size", "auto");

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
      console.log("[remove-bg] Failed, using original logo");
      return null;
    }

    const arrayBuffer = await response.arrayBuffer();
    const resultBase64 = Buffer.from(arrayBuffer).toString("base64");

    console.log(
      "[remove-bg] Success, result base64 length:",
      resultBase64.length,
    );

    return { base64: resultBase64, mediaType: "image/png" };
  } catch {
    console.log("[remove-bg] Failed, using original logo");
    return null;
  }
}
