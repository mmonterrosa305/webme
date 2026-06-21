export type VideoPreset = {
  id: string;
  industry: string;
  label: string;
  video_url: string;
  thumbnail_url: string;
  created_at: string;
};

export const MAX_PRESETS_PER_INDUSTRY = 4;

export const PRESET_STORAGE_BUCKET = "client-assets";

export const SCROLL_HERO_PRESET_FIELD = "scrollHeroPresetId";
