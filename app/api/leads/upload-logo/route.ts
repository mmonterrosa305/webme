import { NextResponse } from "next/server";

import { updateLeadLogoFromUpload } from "@/lib/preview/update-lead-logo";

const MAX_LOGO_BYTES = 5 * 1024 * 1024;

export async function POST(request: Request) {
  console.log(
    "[env check] REMOVE_BG_API_KEY present:",
    !!process.env.REMOVE_BG_API_KEY,
  );

  try {
    const formData = await request.formData();
    const siteSlug =
      typeof formData.get("siteSlug") === "string"
        ? formData.get("siteSlug")!.toString().trim()
        : "";
    const file = formData.get("file");

    if (!siteSlug) {
      return NextResponse.json(
        { error: "siteSlug is required." },
        { status: 400 },
      );
    }

    if (!(file instanceof File)) {
      return NextResponse.json(
        { error: "Logo image file is required." },
        { status: 400 },
      );
    }

    if (!file.type.startsWith("image/")) {
      return NextResponse.json(
        { error: "Only image files are supported." },
        { status: 400 },
      );
    }

    if (file.size > MAX_LOGO_BYTES) {
      return NextResponse.json(
        { error: "Logo must be 5 MB or smaller." },
        { status: 400 },
      );
    }

    const buffer = Buffer.from(await file.arrayBuffer());
    const base64 = buffer.toString("base64");
    const mediaType = file.type.split(";")[0] || "image/png";

    const result = await updateLeadLogoFromUpload({
      siteSlug,
      base64,
      mediaType,
    });

    console.log(
      `[upload-logo] siteSlug=${siteSlug} backgroundRemoval=${result.backgroundRemovalSource} logoUrl=${result.logoUrl}`,
    );

    return NextResponse.json({
      success: true,
      logoUrl: result.logoUrl,
      siteHtml: result.html,
      backgroundRemovalSource: result.backgroundRemovalSource,
    });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Failed to upload logo.";

    return NextResponse.json({ error: message }, { status: 500 });
  }
}
