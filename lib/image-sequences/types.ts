export type ImageSequencePreset = {
  id: string;
  industry: string;
  label: string;
  frames_urls: string[];
  thumbnail_url: string;
  frame_count: number;
  created_at: string;
};

export const MAX_SEQUENCES_PER_INDUSTRY = 4;
export const SEQUENCE_STORAGE_BUCKET = "client-assets";
export const SCROLL_HERO_SEQUENCE_PRESET_FIELD = "scrollHeroSequencePresetId";
export const MAX_SEQUENCE_ZIP_BYTES = 200 * 1024 * 1024;
export const MAX_SEQUENCE_FRAMES = 240;
export const MIN_SEQUENCE_FRAMES = 2;
