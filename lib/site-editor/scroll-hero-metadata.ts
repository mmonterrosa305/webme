import type { SiteMetadata } from "@/lib/site-editor/types";

export function withScrollHeroSequenceMetadata(
  metadata: SiteMetadata,
  sequencePresetId?: string | null,
): SiteMetadata {
  if (!sequencePresetId?.trim()) {
    return metadata;
  }

  return {
    ...metadata,
    scrollHeroSequenceId: sequencePresetId.trim(),
  };
}
