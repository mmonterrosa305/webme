const REQUIRED_VIDEO_ATTRS = ["autoplay", "muted", "loop", "playsinline"] as const;

function stripControlsAttribute(attrs: string): string {
  return attrs
    .replace(/\scontrols\s*=\s*(".*?"|'.*?'|[^\s>]+)/gi, "")
    .replace(/\scontrols\b/gi, "");
}

function ensureRequiredVideoAttrs(attrs: string): string {
  let updated = attrs;

  for (const attr of REQUIRED_VIDEO_ATTRS) {
    if (!new RegExp(`\\b${attr}\\b`, "i").test(updated)) {
      updated += ` ${attr}`;
    }
  }

  return updated;
}

/** Ensures hero background videos autoplay without visible controls. */
export function normalizeHeroVideoAttributes(html: string): string {
  if (
    html.includes('data-webme-scroll-hero="true"') ||
    html.includes('id="webme-scroll-hero"')
  ) {
    return html;
  }

  return html.replace(
    /<video([^>]*data-webme="hero-image"[^>]*)>/gi,
    (_match, attrs: string) => {
      const normalized = ensureRequiredVideoAttrs(stripControlsAttribute(attrs));
      return `<video${normalized}>`;
    },
  );
}
