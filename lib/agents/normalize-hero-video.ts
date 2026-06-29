const REQUIRED_VIDEO_ATTRS = ["autoplay", "muted", "loop", "playsinline"] as const;

const HERO_VIDEO_PLAYBACK_INIT_ID = "webme-hero-video-playback-init";

/** Videos shorter than this (at normal speed) keep default playback rate. */
export const HERO_VIDEO_MIN_DURATION_SEC = 8;

/** Target slow-motion rate for longer hero background videos (0.4–0.5x). */
export const HERO_VIDEO_PLAYBACK_RATE = 0.45;

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

function isScrollHeroSite(html: string): boolean {
  return (
    html.includes('data-webme-scroll-hero="true"') ||
    html.includes('id="webme-scroll-hero"')
  );
}

function hasAutoplayHeroVideo(html: string): boolean {
  return html.includes('data-webme="hero-image"');
}

const HERO_VIDEO_PLAYBACK_INIT_SCRIPT = `<script id="${HERO_VIDEO_PLAYBACK_INIT_ID}">
(function () {
  var MIN_DURATION = ${HERO_VIDEO_MIN_DURATION_SEC};
  var PLAYBACK_RATE = ${HERO_VIDEO_PLAYBACK_RATE};

  function isAutoplayHeroVideo(video) {
    return (
      video &&
      video.getAttribute("data-webme") === "hero-image" &&
      video.getAttribute("data-webme-scroll-hero") !== "true"
    );
  }

  function ensureSeamlessLoop(video) {
    video.loop = true;
    video.setAttribute("loop", "");
  }

  function configureHeroVideo(video) {
    if (!isAutoplayHeroVideo(video)) {
      return;
    }

    if (video.getAttribute("data-webme-hero-video-configured") === "true") {
      return;
    }

    function applySettings() {
      if (!isAutoplayHeroVideo(video)) {
        return;
      }

      var duration = video.duration;
      if (!duration || !isFinite(duration)) {
        return;
      }

      video.setAttribute("data-webme-hero-video-configured", "true");
      ensureSeamlessLoop(video);

      if (duration >= MIN_DURATION) {
        video.playbackRate = PLAYBACK_RATE;
      }

      if (video.paused) {
        var playPromise = video.play();
        if (playPromise && typeof playPromise.catch === "function") {
          playPromise.catch(function () {});
        }
      }
    }

    video.addEventListener("loadedmetadata", applySettings, { once: true });
    if (video.readyState >= 1) {
      applySettings();
    }
  }

  function init() {
    document
      .querySelectorAll('video[data-webme="hero-image"]')
      .forEach(configureHeroVideo);
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", init);
  } else {
    init();
  }
})();
</script>`;

/** Slow long hero background videos and inject the playback init script. Idempotent. */
export function ensureHeroVideoPlayback(html: string): string {
  if (!hasAutoplayHeroVideo(html) || isScrollHeroSite(html)) {
    return html;
  }

  if (html.includes(HERO_VIDEO_PLAYBACK_INIT_ID)) {
    return html;
  }

  if (html.includes("</body>")) {
    return html.replace("</body>", `${HERO_VIDEO_PLAYBACK_INIT_SCRIPT}</body>`);
  }

  return `${html}${HERO_VIDEO_PLAYBACK_INIT_SCRIPT}`;
}

/** Ensures hero background videos autoplay without visible controls. */
export function normalizeHeroVideoAttributes(html: string): string {
  if (isScrollHeroSite(html)) {
    return html;
  }

  const withAttrs = html.replace(
    /<video([^>]*data-webme="hero-image"[^>]*)>/gi,
    (_match, attrs: string) => {
      const normalized = ensureRequiredVideoAttrs(stripControlsAttribute(attrs));
      return `<video${normalized}>`;
    },
  );

  return ensureHeroVideoPlayback(withAttrs);
}
