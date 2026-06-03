import { NextResponse } from "next/server";

import {
  ClientAuthError,
  requirePortalClient,
} from "@/lib/client-auth/require-portal-client";
import type { SiteImageSlot } from "@/lib/site-editor/types";
import { uploadClientAsset } from "@/lib/site-editor/upload-asset";

const VALID_SLOTS = new Set<SiteImageSlot | "logo">([
  "logo",
  "hero",
  "about",
  "service1",
  "service2",
  "service3",
  "service4",
  "gallery1",
  "gallery2",
  "gallery3",
]);

export async function POST(request: Request) {
  try {
    const { client } = await requirePortalClient();
    const formData = await request.formData();
    const slot = formData.get("slot");
    const file = formData.get("file");

    if (typeof slot !== "string" || !VALID_SLOTS.has(slot as SiteImageSlot | "logo")) {
      return NextResponse.json({ error: "Invalid upload slot." }, { status: 400 });
    }

    if (!(file instanceof File)) {
      return NextResponse.json({ error: "Image file is required." }, { status: 400 });
    }

    const publicUrl = await uploadClientAsset({
      clientId: client.id,
      slot: slot as SiteImageSlot | "logo",
      file,
    });

    return NextResponse.json({ url: publicUrl });
  } catch (error) {
    if (error instanceof ClientAuthError) {
      return NextResponse.json({ error: error.message }, { status: error.status });
    }

    const message =
      error instanceof Error ? error.message : "Failed to upload image.";

    console.error("[client/site/upload POST]", message);

    return NextResponse.json({ error: message }, { status: 500 });
  }
}
