import { getImageSequenceById } from "./queries";
import { SCROLL_HERO_SEQUENCE_PRESET_FIELD } from "./types";

export async function resolveScrollHeroSequenceForBuild(options: {
  formData?: FormData | null;
  presetId?: string | null;
}): Promise<string[] | null> {
  if (options.formData) {
    const presetFromForm = options.formData.get(SCROLL_HERO_SEQUENCE_PRESET_FIELD);
    if (typeof presetFromForm === "string" && presetFromForm.trim()) {
      options.presetId = presetFromForm.trim();
    }
  }

  const presetId = options.presetId?.trim();
  if (!presetId) {
    return null;
  }

  const sequence = await getImageSequenceById(presetId);
  if (!sequence?.frames_urls?.length) {
    return null;
  }

  return sequence.frames_urls;
}
