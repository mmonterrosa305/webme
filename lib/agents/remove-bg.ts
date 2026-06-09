export async function removeBackground(
  base64Image: string,
  mediaType: string,
): Promise<{ base64: string; mediaType: string } | null> {
  const apiKey = process.env.REMOVE_BG_API_KEY?.trim();
  if (!apiKey) return null;

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

    if (!response.ok) {
      console.error(
        "[remove-bg] API error:",
        response.status,
        await response.text(),
      );
      return null;
    }

    const arrayBuffer = await response.arrayBuffer();
    const base64 = Buffer.from(arrayBuffer).toString("base64");

    return { base64, mediaType: "image/png" };
  } catch {
    return null;
  }
}
