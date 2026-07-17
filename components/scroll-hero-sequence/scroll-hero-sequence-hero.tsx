"use client";

import { useEffect, useRef, useState } from "react";

type ScrollHeroSequenceHeroProps = {
  sequenceId: string;
  businessName?: string;
  posterUrl?: string;
  headline?: string;
  tagline?: string;
  ctaLabel?: string;
  ctaHref?: string;
};

type LoadState = "loading" | "ready" | "static" | "error";

const HERO_TEXT_SHADOW = "0 2px 16px rgba(0, 0, 0, 0.65)";

/** Skip washed-out opening frames — sequence starts at frame 81 (index 80). */
const START_FRAME_OFFSET = 80;
/** Viewport heights of scroll required to scrub from first to last frame. */
const SEQUENCE_SCROLL_VIEWPORT_MULTIPLIER = 3;
/** Subtle Ken Burns zoom: 1 → 1.08 → 1 over a full cycle (transform only — not frames). */
const KEN_BURNS_SCALE_MAX = 1.08;
const KEN_BURNS_HALF_CYCLE_SEC = 8;
/** Fail over to a static hero on mobile if frames have not loaded by then. */
const MOBILE_LOAD_TIMEOUT_MS = 4000;
/** Concurrent image loads on mobile — Safari chokes on Promise.all of 100+. */
const MOBILE_LOAD_BATCH_SIZE = 6;
/** On mobile, keep every Nth frame after the start offset. */
const MOBILE_FRAME_STEP = 3;

function getSequenceSectionHeightVh(): number {
  // Sticky 100vh hero + scroll runway for scrub distance.
  return 100 + SEQUENCE_SCROLL_VIEWPORT_MULTIPLIER * 100;
}

function findContactTarget(root: Document): HTMLElement | null {
  return (
    root.getElementById("contact") ||
    (root.querySelector('[data-webme="phone"]')?.closest("section") as
      | HTMLElement
      | null) ||
    (root.querySelector("section form")?.closest("section") as HTMLElement | null)
  );
}

function scrollToContactSection(event: React.MouseEvent<HTMLAnchorElement>) {
  event.preventDefault();

  const iframe = document.querySelector("iframe") as HTMLIFrameElement | null;
  const iframeDoc = iframe?.contentDocument;
  const target = iframeDoc
    ? findContactTarget(iframeDoc)
    : findContactTarget(document);

  if (!target) {
    return;
  }

  const top = target.getBoundingClientRect().top + window.scrollY;
  window.scrollTo({ top, behavior: "smooth" });
}

/**
 * Only treat as mobile/low-bandwidth when clearly constrained.
 * Wide desktop viewports must never match — that was incorrectly
 * triggering the static poster fallback.
 */
function isMobileOrConstrainedNetwork(): boolean {
  if (typeof window === "undefined") {
    return false;
  }

  const nav = navigator as Navigator & {
    connection?: { saveData?: boolean; effectiveType?: string };
  };

  if (nav.connection?.saveData) {
    return true;
  }

  const effectiveType = nav.connection?.effectiveType;
  if (effectiveType === "2g" || effectiveType === "slow-2g") {
    return true;
  }

  const narrowViewport =
    window.matchMedia?.("(max-width: 768px)")?.matches ??
    window.innerWidth <= 768;

  // Desktop (even with a touchscreen) stays on the full sequence when wide.
  if (!narrowViewport) {
    return false;
  }

  const coarsePointer =
    window.matchMedia?.("(pointer: coarse)")?.matches ?? false;
  const noHover = window.matchMedia?.("(hover: none)")?.matches ?? false;

  // Phone-like: narrow AND touch-primary (no fine pointer / hover).
  return coarsePointer || noHover;
}

/**
 * Build the URL list used for playback.
 * Mobile: start at START_FRAME_OFFSET and keep every Nth frame.
 * Desktop: keep the full list (scrub still starts at START_FRAME_OFFSET).
 */
function selectPlaybackUrls(urls: string[], lightweight: boolean): {
  urls: string[];
  trimmed: boolean;
} {
  if (!urls.length) {
    return { urls: [], trimmed: false };
  }

  if (!lightweight) {
    return { urls, trimmed: false };
  }

  const start = Math.min(START_FRAME_OFFSET, Math.max(0, urls.length - 1));
  const sampled: string[] = [];
  for (let index = start; index < urls.length; index += MOBILE_FRAME_STEP) {
    const url = urls[index];
    if (url) {
      sampled.push(url);
    }
  }

  if (!sampled.length && urls[start]) {
    sampled.push(urls[start]);
  }

  return { urls: sampled, trimmed: true };
}

function getLoopBounds(
  totalFrames: number,
  framesAlreadyTrimmed: boolean,
): {
  loopStart: number;
  loopEnd: number;
  loopLength: number;
} {
  const loopStart =
    framesAlreadyTrimmed || totalFrames <= START_FRAME_OFFSET + 1
      ? 0
      : START_FRAME_OFFSET;
  const loopEnd = Math.max(loopStart, totalFrames - 1);
  return {
    loopStart,
    loopEnd,
    loopLength: loopEnd - loopStart + 1,
  };
}

/** Map scroll progress 0→1 to an exact frame within the scrub range. */
function progressToExactFrame(
  progress: number,
  totalFrames: number,
  framesAlreadyTrimmed: boolean,
): number {
  const { loopStart, loopEnd } = getLoopBounds(
    totalFrames,
    framesAlreadyTrimmed,
  );
  const span = Math.max(0, loopEnd - loopStart);
  const clamped = Math.min(1, Math.max(0, progress));
  return loopStart + clamped * span;
}

function isWebpFrameUrl(url: string): boolean {
  return /\.webp(?:$|\?)/i.test(url);
}

function loadImageElement(
  src: string,
  crossOrigin?: "anonymous",
): Promise<HTMLImageElement | null> {
  return new Promise((resolve) => {
    const img = new Image();
    img.decoding = "async";
    if (crossOrigin) {
      img.crossOrigin = crossOrigin;
    }
    img.onload = () => {
      void img.decode?.().then(() => resolve(img)).catch(() => resolve(img));
    };
    img.onerror = () => resolve(null);
    img.src = src;
  });
}

async function loadFrameImage(
  url: string,
  preferSimpleLoad: boolean,
): Promise<HTMLImageElement | null> {
  // Mobile Safari is more reliable with direct Image loads than fetch→blob.
  if (preferSimpleLoad || !isWebpFrameUrl(url)) {
    return loadImageElement(url, "anonymous");
  }

  try {
    const response = await fetch(url, { mode: "cors", credentials: "omit" });
    if (!response.ok) {
      return loadImageElement(url, "anonymous");
    }

    const blob = await response.blob();
    const objectUrl = URL.createObjectURL(blob);
    const img = await loadImageElement(objectUrl);
    URL.revokeObjectURL(objectUrl);
    return img;
  } catch {
    return loadImageElement(url, "anonymous");
  }
}

/** Force the document to remain scrollable through the scrub runway. */
function unlockDocumentScroll() {
  if (typeof document === "undefined") {
    return;
  }

  const html = document.documentElement;
  const body = document.body;

  html.classList.remove("h-full");
  html.classList.add("webme-seq-hero-page");
  body.classList.remove("h-full", "min-h-0");
  body.classList.add("webme-seq-hero-page");

  html.style.setProperty("overflow", "auto", "important");
  html.style.setProperty("overflow-y", "auto", "important");
  html.style.setProperty("height", "auto", "important");
  html.style.setProperty("max-height", "none", "important");
  html.style.setProperty("min-height", "100%", "important");

  body.style.setProperty("overflow", "visible", "important");
  body.style.setProperty("overflow-y", "visible", "important");
  body.style.setProperty("height", "auto", "important");
  body.style.setProperty("max-height", "none", "important");
  body.style.setProperty("min-height", "100%", "important");
  body.style.setProperty("display", "block", "important");
}

export function ScrollHeroSequenceHero({
  sequenceId,
  businessName = "",
  posterUrl = "",
  headline = "",
  tagline = "",
  ctaLabel = "Contact Us",
  ctaHref = "#contact",
}: ScrollHeroSequenceHeroProps) {
  const resolvedHeadline = headline.trim() || businessName.trim();
  const resolvedTagline = tagline.trim();
  const [loadState, setLoadState] = useState<LoadState>("loading");

  const sectionRef = useRef<HTMLElement>(null);
  const pinRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);

  // Keep page scroll available for the scrub runway.
  useEffect(() => {
    unlockDocumentScroll();
    const timers = [0, 250, 1000, 4000].map((ms) =>
      window.setTimeout(unlockDocumentScroll, ms),
    );

    return () => {
      for (const id of timers) {
        window.clearTimeout(id);
      }
      unlockDocumentScroll();
    };
  }, []);

  useEffect(() => {
    const section = sectionRef.current;
    const pin = pinRef.current;
    const canvas = canvasRef.current;
    if (!section || !pin || !canvas) {
      return;
    }

    const ctx = canvas.getContext("2d");
    if (!ctx) {
      return;
    }

    let cancelled = false;
    let frameUrls: string[] = [];
    let framesAlreadyTrimmed = false;
    const imageCache: Record<number, HTMLImageElement> = {};
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    const lightweight = isMobileOrConstrainedNetwork();

    let exactFrame = 0;
    let scrollRafId = 0;
    let allFramesLoaded = false;
    let fallbackActivated = false;
    let loadTimeoutId = 0;

    const resizeCanvas = () => {
      const width = Math.max(1, Math.floor(window.innerWidth || 1));
      const height = Math.max(1, Math.floor(window.innerHeight || 1));
      canvas.width = Math.floor(width * dpr);
      canvas.height = Math.floor(height * dpr);
      canvas.style.width = `${width}px`;
      canvas.style.height = `${height}px`;
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    };

    /** object-fit: cover — scale image to fill the full canvas, crop overflow. */
    const drawCover = (img: HTMLImageElement) => {
      const cw = canvas.width / dpr;
      const ch = canvas.height / dpr;
      const iw = img.naturalWidth || img.width;
      const ih = img.naturalHeight || img.height;
      if (!iw || !ih) {
        return;
      }

      const scale = Math.max(cw / iw, ch / ih);
      const dw = iw * scale;
      const dh = ih * scale;
      const dx = (cw - dw) / 2;
      const dy = (ch - dh) / 2;
      ctx.drawImage(img, dx, dy, dw, dh);
    };

    const loadImageAt = async (index: number): Promise<HTMLImageElement | null> => {
      if (index < 0 || index >= frameUrls.length) {
        return null;
      }
      if (imageCache[index]) {
        return imageCache[index];
      }

      const url = frameUrls[index];
      if (!url) {
        return null;
      }

      const img = await loadFrameImage(url, lightweight);
      if (img && !cancelled) {
        imageCache[index] = img;
      }
      return img;
    };

    const showStaticImage = async (preferredUrl?: string) => {
      resizeCanvas();
      ctx.clearRect(0, 0, canvas.width / dpr, canvas.height / dpr);

      const cached =
        imageCache[0] ||
        imageCache[Object.keys(imageCache).map(Number).sort((a, b) => a - b)[0] ?? -1];

      if (cached) {
        drawCover(cached);
        return true;
      }

      const candidates = [
        preferredUrl,
        posterUrl,
        frameUrls[0],
        frameUrls[Math.min(START_FRAME_OFFSET, Math.max(0, frameUrls.length - 1))],
      ].filter((url): url is string => Boolean(url?.trim()));

      for (const url of candidates) {
        const img = await loadFrameImage(url, true);
        if (cancelled) {
          return false;
        }
        if (img) {
          drawCover(img);
          return true;
        }
      }

      return false;
    };

    const activateStaticFallback = async (reason: string) => {
      if (cancelled || fallbackActivated || allFramesLoaded) {
        return;
      }

      fallbackActivated = true;
      window.clearTimeout(loadTimeoutId);
      console.warn("[sequence-hero] Falling back to static hero:", reason);

      const drawn = await showStaticImage();
      if (cancelled) {
        return;
      }

      setLoadState(drawn ? "static" : "error");
      window.dispatchEvent(new CustomEvent("webme-sequence-hero-ready"));
    };

    const preloadFramesInBatches = async (): Promise<boolean> => {
      const indices = frameUrls.map((_, index) => index);
      let loadedCount = 0;

      for (let i = 0; i < indices.length; i += MOBILE_LOAD_BATCH_SIZE) {
        if (cancelled || fallbackActivated) {
          return false;
        }

        const batch = indices.slice(i, i + MOBILE_LOAD_BATCH_SIZE);
        const results = await Promise.all(batch.map((index) => loadImageAt(index)));
        loadedCount += results.filter(Boolean).length;

        // First successful frame → draw a poster early so mobile isn't blank.
        if (loadedCount > 0 && i === 0) {
          const first = results.find(Boolean);
          if (first) {
            resizeCanvas();
            ctx.clearRect(0, 0, canvas.width / dpr, canvas.height / dpr);
            drawCover(first);
          }
        }
      }

      // Require most frames; allow a few failures on flaky mobile networks.
      const minRequired = Math.max(1, Math.ceil(frameUrls.length * 0.7));
      return loadedCount >= minRequired;
    };

    /** Desktop: load every frame in parallel. */
    const preloadAllFrames = async (): Promise<boolean> => {
      if (cancelled || fallbackActivated) {
        return false;
      }

      const results = await Promise.all(
        frameUrls.map((_url, index) => loadImageAt(index)),
      );
      if (cancelled || fallbackActivated) {
        return false;
      }

      return results.every(Boolean);
    };

    const drawExactFrame = (frame: number) => {
      if (!frameUrls.length || !allFramesLoaded) {
        return;
      }

      const totalFrames = frameUrls.length;
      const { loopStart, loopEnd } = getLoopBounds(
        totalFrames,
        framesAlreadyTrimmed,
      );
      const clamped = Math.min(Math.max(frame, loopStart), loopEnd);
      const idx = Math.min(Math.floor(clamped), loopEnd);
      const next = Math.min(idx + 1, loopEnd);
      const blend = clamped - idx;

      const imgA = imageCache[idx];
      const imgB = imageCache[next];
      if (!imgA) {
        return;
      }

      resizeCanvas();
      ctx.clearRect(0, 0, canvas.width / dpr, canvas.height / dpr);
      drawCover(imgA);

      if (blend > 0.001 && imgB && next !== idx) {
        ctx.globalAlpha = blend;
        drawCover(imgB);
        ctx.globalAlpha = 1;
      }
    };

    /** Scroll progress through the runway → frame. No timer-driven advance. */
    const getScrollProgress = (): number => {
      const rect = section.getBoundingClientRect();
      const sectionTop = window.scrollY + rect.top;
      const viewportHeight = Math.max(1, window.innerHeight);
      const scrubDistance = SEQUENCE_SCROLL_VIEWPORT_MULTIPLIER * viewportHeight;
      const scrollPast = window.scrollY - sectionTop;
      return Math.min(1, Math.max(0, scrollPast / scrubDistance));
    };

    const syncFrameToScroll = () => {
      if (cancelled || fallbackActivated || !allFramesLoaded) {
        return;
      }

      const progress = getScrollProgress();
      exactFrame = progressToExactFrame(
        progress,
        frameUrls.length,
        framesAlreadyTrimmed,
      );
      drawExactFrame(exactFrame);
    };

    const onScrollOrResize = () => {
      if (scrollRafId) {
        return;
      }
      scrollRafId = window.requestAnimationFrame(() => {
        scrollRafId = 0;
        syncFrameToScroll();
      });
    };

    const startScrollScrub = () => {
      const { loopStart } = getLoopBounds(
        frameUrls.length,
        framesAlreadyTrimmed,
      );
      exactFrame = loopStart;
      drawExactFrame(exactFrame);
      syncFrameToScroll();
      window.addEventListener("scroll", onScrollOrResize, { passive: true });
      window.addEventListener("resize", onScrollOrResize, { passive: true });
      // iOS momentum scroll can settle after the last scroll event.
      window.addEventListener("touchmove", onScrollOrResize, { passive: true });
      window.dispatchEvent(new CustomEvent("webme-sequence-hero-ready"));
    };

    const beginSequence = async (urls: string[]) => {
      const selected = selectPlaybackUrls(urls, lightweight);
      frameUrls = selected.urls;
      framesAlreadyTrimmed = selected.trimmed;

      if (!frameUrls.length) {
        await activateStaticFallback("empty-frame-list");
        return;
      }

      // Save-Data / very constrained: skip sequence and use a static hero.
      if (
        lightweight &&
        (navigator as Navigator & { connection?: { saveData?: boolean } })
          .connection?.saveData
      ) {
        await activateStaticFallback("save-data");
        return;
      }

      // Timeout only on mobile — desktop full sequences often exceed 4s.
      if (lightweight) {
        loadTimeoutId = window.setTimeout(() => {
          void activateStaticFallback("load-timeout");
        }, MOBILE_LOAD_TIMEOUT_MS);
      }

      const loaded = lightweight
        ? await preloadFramesInBatches()
        : await preloadAllFrames();

      if (cancelled || fallbackActivated) {
        return;
      }

      window.clearTimeout(loadTimeoutId);

      if (!loaded) {
        await activateStaticFallback("preload-incomplete");
        return;
      }

      allFramesLoaded = true;
      setLoadState("ready");
      startScrollScrub();
    };

    const onResize = () => {
      resizeCanvas();
      if (allFramesLoaded) {
        syncFrameToScroll();
      } else if (fallbackActivated) {
        void showStaticImage();
      }
    };

    window.addEventListener("resize", onResize);

    void fetch(`/api/image-sequences/${encodeURIComponent(sequenceId)}`)
      .then((response) => {
        if (!response.ok) {
          throw new Error("Sequence fetch failed");
        }
        return response.json() as Promise<{ frames_urls?: string[] }>;
      })
      .then((data) => {
        if (cancelled) {
          return;
        }
        if (data.frames_urls?.length) {
          void beginSequence(data.frames_urls);
        } else {
          void activateStaticFallback("missing-frames");
        }
      })
      .catch((error) => {
        console.warn("[sequence-hero] Sequence metadata fetch failed:", error);
        if (!cancelled) {
          void activateStaticFallback("metadata-fetch-error");
        }
      });

    return () => {
      cancelled = true;
      window.clearTimeout(loadTimeoutId);
      window.removeEventListener("resize", onResize);
      window.removeEventListener("scroll", onScrollOrResize);
      window.removeEventListener("resize", onScrollOrResize);
      window.removeEventListener("touchmove", onScrollOrResize);
      window.cancelAnimationFrame(scrollRafId);
    };
  }, [sequenceId, posterUrl]);

  const showOverlay = Boolean(resolvedHeadline || resolvedTagline || ctaLabel);
  const heroVisible = loadState === "ready" || loadState === "static";
  const isStaticFallback = loadState === "static" || loadState === "error";

  return (
    <section
      ref={sectionRef}
      id="webme-scroll-hero-external"
      className="relative w-full bg-black"
      style={{
        // Static fallback is a single viewport; scrub mode needs the runway.
        height: isStaticFallback ? "100vh" : `${getSequenceSectionHeightVh()}vh`,
      }}
    >
      <style>{`
        html.webme-seq-hero-page,
        body.webme-seq-hero-page {
          height: auto !important;
          max-height: none !important;
          min-height: 100% !important;
          overflow-x: hidden !important;
          overflow-y: auto !important;
        }
        body.webme-seq-hero-page {
          display: block !important;
        }
        @keyframes webme-sequence-ken-burns {
          0%, 100% { transform: scale(1); }
          50% { transform: scale(${KEN_BURNS_SCALE_MAX}); }
        }
        .webme-sequence-canvas-ken-burns {
          animation: webme-sequence-ken-burns ${KEN_BURNS_HALF_CYCLE_SEC * 2}s ease-in-out infinite;
          transform-origin: center center;
          will-change: transform;
        }
      `}</style>
      <div
        ref={pinRef}
        className="sticky top-0 h-screen w-full shrink-0 overflow-hidden bg-black"
      >
        <div className="absolute inset-0">
          <div
            className={`pointer-events-none absolute inset-0 z-0 bg-black/50 transition-opacity duration-700 ${
              heroVisible ? "opacity-100" : "opacity-60"
            }`}
            aria-hidden
          />
          <div className="absolute inset-0 z-[1] overflow-hidden">
            <div
              className={`absolute inset-0 ${
                isStaticFallback ? "webme-sequence-canvas-ken-burns" : ""
              }`}
            >
              <canvas ref={canvasRef} className="block h-full w-full" />
            </div>
          </div>
          {loadState === "loading" ? (
            <div
              className="absolute inset-0 z-20 flex items-center justify-center bg-black/35"
              aria-live="polite"
              aria-busy="true"
            >
              <div className="flex flex-col items-center gap-4">
                <div className="h-10 w-10 animate-spin rounded-full border-2 border-white/25 border-t-white" />
                <span className="text-sm font-medium tracking-wide text-white/80">
                  Loading sequence…
                </span>
              </div>
            </div>
          ) : null}
        </div>
        {showOverlay ? (
          <div
            className={`relative z-20 mx-auto flex min-h-screen w-full max-w-4xl flex-col items-center justify-start gap-4 px-6 pt-[120px] text-center text-white transition-opacity duration-700 ${
              heroVisible ? "opacity-100" : "opacity-0"
            }`}
          >
            {resolvedHeadline ? (
              <h1
                className="font-serif text-4xl font-bold leading-tight text-white md:text-5xl"
                style={{ textShadow: HERO_TEXT_SHADOW }}
              >
                {resolvedHeadline}
              </h1>
            ) : null}
            {resolvedTagline ? (
              <p
                className="max-w-2xl text-xl font-medium leading-relaxed text-white md:text-2xl"
                style={{ textShadow: HERO_TEXT_SHADOW }}
              >
                {resolvedTagline}
              </p>
            ) : null}
            {ctaLabel ? (
              <a
                href={ctaHref}
                onClick={scrollToContactSection}
                className="pointer-events-auto mt-2 inline-block rounded px-10 py-4 text-base font-semibold text-neutral-900 no-underline transition hover:-translate-y-0.5"
                style={{
                  background: "#ffffff",
                  border: "2px solid #ffffff",
                  boxShadow: HERO_TEXT_SHADOW,
                }}
              >
                {ctaLabel}
              </a>
            ) : null}
          </div>
        ) : null}
      </div>
    </section>
  );
}
