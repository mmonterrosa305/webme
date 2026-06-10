import { createAdminClient } from "@/lib/supabase/admin";

export async function uploadLogo(
  base64: string,
  mediaType: string,
  businessName: string,
): Promise<string | null> {
  try {
    const supabase = createAdminClient();
    const buffer = Buffer.from(base64, "base64");
    const ext = mediaType.includes("png") ? "png" : mediaType.includes("gif") ? "gif" : mediaType.includes("webp") ? "webp" : "jpg";
    const slug = businessName.toLowerCase().replace(/[^a-z0-9]/g, "-").replace(/-+/g, "-").slice(0, 40);
    const filename = `logos/${slug}-${Date.now()}.${ext}`;

    const { error } = await supabase.storage
      .from("client-assets")
      .upload(filename, buffer, {
        contentType: mediaType,
        upsert: true,
      });

    if (error) {
      console.error("[upload-logo] Upload error:", error.message);
      return null;
    }

    const { data } = supabase.storage
      .from("client-assets")
      .getPublicUrl(filename);

    return data.publicUrl;
  } catch (error) {
    console.error("[upload-logo] Error:", error);
    return null;
  }
}
