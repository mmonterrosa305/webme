import { createAdminClient } from "@/lib/supabase/admin";
import { getSupabaseUrl } from "@/lib/supabase/env";

import type { SiteImageSlot } from "./types";

const CLIENT_ASSETS_BUCKET = "client-assets";
const MAX_UPLOAD_BYTES = 5 * 1024 * 1024;
const ALLOWED_MIME_TYPES = new Set([
  "image/png",
  "image/jpeg",
  "image/webp",
  "image/svg+xml",
]);

const SLOT_FOLDER: Record<SiteImageSlot | "logo", string> = {
  logo: "logo",
  hero: "hero",
  about: "about",
  service1: "services",
  service2: "services",
  service3: "services",
  service4: "services",
  gallery1: "gallery",
  gallery2: "gallery",
  gallery3: "gallery",
};

function sanitizeFilename(name: string): string {
  return name.replace(/[^a-zA-Z0-9._-]/g, "-").slice(0, 80);
}

export async function ensureClientAssetsBucket(): Promise<void> {
  const supabase = createAdminClient();
  const { data: buckets, error: listError } =
    await supabase.storage.listBuckets();

  if (listError) {
    throw new Error(`Failed to list storage buckets: ${listError.message}`);
  }

  const exists = buckets.some((bucket) => bucket.name === CLIENT_ASSETS_BUCKET);

  if (!exists) {
    const { error: createError } = await supabase.storage.createBucket(
      CLIENT_ASSETS_BUCKET,
      { public: true },
    );

    if (createError) {
      throw new Error(
        `Failed to create ${CLIENT_ASSETS_BUCKET} bucket: ${createError.message}`,
      );
    }
  }
}

export async function uploadClientAsset({
  clientId,
  slot,
  file,
}: {
  clientId: string;
  slot: SiteImageSlot | "logo";
  file: File;
}): Promise<string> {
  if (!ALLOWED_MIME_TYPES.has(file.type)) {
    throw new Error("Only PNG, JPG, WebP, or SVG images are allowed.");
  }

  if (file.size > MAX_UPLOAD_BYTES) {
    throw new Error("Image must be 5 MB or smaller.");
  }

  await ensureClientAssetsBucket();

  const supabase = createAdminClient();
  const extension = file.name.includes(".")
    ? file.name.slice(file.name.lastIndexOf("."))
    : ".jpg";
  const objectPath = `${clientId}/${SLOT_FOLDER[slot]}/${Date.now()}-${sanitizeFilename(file.name || `upload${extension}`)}`;
  const buffer = Buffer.from(await file.arrayBuffer());

  const { error: uploadError } = await supabase.storage
    .from(CLIENT_ASSETS_BUCKET)
    .upload(objectPath, buffer, {
      contentType: file.type,
      upsert: true,
    });

  if (uploadError) {
    throw new Error(uploadError.message);
  }

  const { data } = supabase.storage
    .from(CLIENT_ASSETS_BUCKET)
    .getPublicUrl(objectPath);

  const baseUrl = getSupabaseUrl();
  if (data.publicUrl.startsWith(baseUrl)) {
    return data.publicUrl;
  }

  return `${baseUrl}/storage/v1/object/public/${CLIENT_ASSETS_BUCKET}/${objectPath}`;
}
