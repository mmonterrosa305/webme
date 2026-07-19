import { NextResponse } from "next/server";

import {
  photoSlotToUploadFolder,
  replaceSlotImageHtml,
  updateMetadataForSlot,
  VALID_PHOTO_SLOTS,
} from "@/lib/preview/replace-slot-image";
import { uploadClientAsset } from "@/lib/site-editor/upload-asset";
import { createAdminClient } from "@/lib/supabase/admin";
import type { SiteMetadata } from "@/lib/site-editor/types";

export const runtime = "nodejs";
export const maxDuration = 60;

const MAX_PHOTO_BYTES = 5 * 1024 * 1024;
const ALLOWED_PHOTO_TYPES = new Set([
  "image/jpeg",
  "image/png",
  "image/webp",
]);

export async function POST(request: Request) {
  try {
    const formData = await request.formData();
    const siteSlug =
      typeof formData.get("siteSlug") === "string"
        ? formData.get("siteSlug")!.toString().trim()
        : "";
    const slot =
      typeof formData.get("slot") === "string"
        ? formData.get("slot")!.toString().trim()
        : "";
    const file = formData.get("file");

    if (!siteSlug || !slot) {
      return NextResponse.json(
        { error: "siteSlug and slot are required." },
        { status: 400 },
      );
    }

    if (!VALID_PHOTO_SLOTS.has(slot)) {
      return NextResponse.json({ error: "Invalid slot." }, { status: 400 });
    }

    const uploadSlot = photoSlotToUploadFolder(slot);
    if (!uploadSlot) {
      return NextResponse.json({ error: "Invalid slot." }, { status: 400 });
    }

    if (!(file instanceof File) || file.size === 0) {
      return NextResponse.json(
        { error: "Image file is required." },
        { status: 400 },
      );
    }

    if (!ALLOWED_PHOTO_TYPES.has(file.type)) {
      return NextResponse.json(
        { error: "Only JPG, PNG, or WebP images are supported." },
        { status: 400 },
      );
    }

    if (file.size > MAX_PHOTO_BYTES) {
      return NextResponse.json(
        { error: "Image must be 5 MB or smaller." },
        { status: 400 },
      );
    }

    const supabase = createAdminClient();
    const { data: lead, error: fetchError } = await supabase
      .from("leads")
      .select("site_html, site_metadata")
      .eq("site_slug", siteSlug)
      .maybeSingle();

    if (fetchError || !lead?.site_html) {
      return NextResponse.json({ error: "Lead not found." }, { status: 404 });
    }

    const newPhotoUrl = await uploadClientAsset({
      clientId: `leads/${siteSlug}`,
      slot: uploadSlot,
      file,
    });

    const { html: updatedHtml, replaced } = replaceSlotImageHtml(
      lead.site_html,
      slot,
      newPhotoUrl,
    );

    if (!replaced) {
      return NextResponse.json(
        { error: `Could not find image markup for slot "${slot}".` },
        { status: 404 },
      );
    }

    const nextMetadata = updateMetadataForSlot(
      (lead.site_metadata as SiteMetadata | null) ?? null,
      slot,
      newPhotoUrl,
    );

    const { error: updateError } = await supabase
      .from("leads")
      .update({
        site_html: updatedHtml,
        site_metadata: nextMetadata,
      })
      .eq("site_slug", siteSlug);

    if (updateError) {
      return NextResponse.json({ error: updateError.message }, { status: 500 });
    }

    await supabase
      .from("projects")
      .update({
        site_html: updatedHtml,
        site_metadata: nextMetadata,
      })
      .eq("site_slug", siteSlug);

    return NextResponse.json({
      success: true,
      newPhotoUrl,
      slot,
      siteHtml: updatedHtml,
    });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Failed to upload photo.";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
