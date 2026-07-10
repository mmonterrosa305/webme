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

type LoadState = "loading" | "ready" | "error";

const HERO_TEXT_SHADOW = "0 2px 16px rgba(0, 0, 0, 0.65)";

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

/** Viewport heights of scroll required to scrub from first to last frame. */
const SEQUENCE_SCROLL_VIEWPORT_MULTIPLIER = 3;
/** Skip washed-out opening frames — sequence starts at frame 46 (index 45). */
const START_FRAME_OFFSET = 45;
const LOOP_FADE_FRAME_COUNT = 15;
const LOOP_FADE_MIN_OPACITY = 0;
const LOOP_FADE_MAX_OPACITY = 1;
const KEN_BURNS_SCALE_MAX = 1.08;
const KEN_BURNS_HALF_CYCLE_SEC = 8;
/** Start auto-advancing frames after this long without scroll. */
const AUTO_PLAY_IDLE_MS = 300;
/** Auto-play frame rate when the user is not scrolling. */
const AUTO_PLAY_FPS = 8;

function lerp(start: number, end: number, amount: number): number {
  return start + (end - start) * amount;
}

function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value));
}

function segmentProgress(value: number, start: number, end: number): number {
  if (value <= start) {
    return 0;
  }
  if (value >= end) {
    return 1;
  }
  return (value - start) / (end - start);
}

function fadeInOut(
  progress: number,
  fadeInEnd: number,
  holdEnd: number,
  fadeOutEnd: number,
): number {
  if (progress <= fadeInEnd) {
    return segmentProgress(progress, 0, fadeInEnd);
  }
  if (progress <= holdEnd) {
    return 1;
  }
  if (progress <= fadeOutEnd) {
    return 1 - segmentProgress(progress, holdEnd, fadeOutEnd);
  }
  return 0;
}

function getSequenceSectionHeightVh(): number {
  return 100 + SEQUENCE_SCROLL_VIEWPORT_MULTIPLIER * 100;
}

function progressToExactFrame(progress: number, totalFrames: number): number {
  const clampedProgress = clamp(progress, 0, 1);

  if (totalFrames <= START_FRAME_OFFSET + 1) {
    return clampedProgress * (totalFrames - 1);
  }

  return (
    START_FRAME_OFFSET +
    clampedProgress * (totalFrames - START_FRAME_OFFSET - 1)
  );
}

function exactFrameToProgress(exactFrame: number, totalFrames: number): number {
  if (totalFrames <= 1) {
    return 0;
  }

  if (totalFrames <= START_FRAME_OFFSET + 1) {
    return clamp(exactFrame / (totalFrames - 1), 0, 1);
  }

  const start = START_FRAME_OFFSET;
  const end = totalFrames - 1;
  return clamp((exactFrame - start) / (end - start), 0, 1);
}

function getAutoPlayLoopBounds(totalFrames: number): {
  loopStart: number;
  loopEnd: number;
  loopLength: number;
} {
  const loopStart = totalFrames <= START_FRAME_OFFSET + 1 ? 0 : START_FRAME_OFFSET;
  const loopEnd = totalFrames - 1;
  return {
    loopStart,
    loopEnd,
    loopLength: loopEnd - loopStart + 1,
  };
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

async function loadFrameImage(url: string): Promise<HTMLImageElement | null> {
  if (!isWebpFrameUrl(url)) {
    return loadImageElement(url, "anonymous");
  }

  try {
    const response = await fetch(url);
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

function getLoopFadeOpacity(frameProgress: number, frameCount: number): number {
  if (frameCount <= 1) {
    return LOOP_FADE_MAX_OPACITY;
  }

  const maxIndex = frameCount - 1;
  const fadeFrames = Math.min(
    LOOP_FADE_FRAME_COUNT,
    Math.max(1, Math.floor(frameCount / 2)),
  );
  const exactFrame = progressToExactFrame(frameProgress, frameCount);

  if (exactFrame <= fadeFrames - 1) {
    if (fadeFrames <= 1) {
      return LOOP_FADE_MAX_OPACITY;
    }
    return lerp(
      LOOP_FADE_MIN_OPACITY,
      LOOP_FADE_MAX_OPACITY,
      exactFrame / (fadeFrames - 1),
    );
  }

  const fadeOutStart = maxIndex - fadeFrames + 1;
  if (exactFrame >= fadeOutStart) {
    if (fadeFrames <= 1) {
      return LOOP_FADE_MIN_OPACITY;
    }
    const t = (exactFrame - fadeOutStart) / (fadeFrames - 1);
    return lerp(LOOP_FADE_MAX_OPACITY, LOOP_FADE_MIN_OPACITY, t);
  }

  return LOOP_FADE_MAX_OPACITY;
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
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const headlineRef = useRef<HTMLHeadingElement>(null);
  const taglineRef = useRef<HTMLParagraphElement>(null);
  const ctaRef = useRef<HTMLAnchorElement>(null);

  useEffect(() => {
    const section = sectionRef.current;
    const canvas = canvasRef.current;
    if (!section || !canvas) {
      return;
    }

    const ctx = canvas.getContext("2d");
    if (!ctx) {
      return;
    }

    const headlineEl = headlineRef.current;
    const taglineEl = taglineRef.current;
    const ctaEl = ctaRef.current;

    let cancelled = false;
    let frameUrls: string[] = [];
    const imageCache: Record<number, HTMLImageElement> = {};
    const dpr = window.devicePixelRatio || 1;

    let frameProgress = 0;
    let autoPlayExactFrame = START_FRAME_OFFSET;
    let autoPlaying = false;
    let lastScrollTime = performance.now();
    let lastTickTime = 0;
    let rafId = 0;
    let allFramesLoaded = false;

    const getScrollProgress = (): number => {
      const rect = section.getBoundingClientRect();
      const scrollPast = Math.max(0, -rect.top);
      const viewport = window.innerHeight || 1;
      const scrollRange = viewport * SEQUENCE_SCROLL_VIEWPORT_MULTIPLIER;
      return clamp(scrollPast / scrollRange, 0, 1);
    };

    const isScrollIdle = (): boolean =>
      performance.now() - lastScrollTime >= AUTO_PLAY_IDLE_MS;

    const renderFrame = () => {
      drawFrameSync(frameProgress);
      updateTextOverlay(frameProgress);
      updateCanvasLoopFade();
    };

    const advanceAutoPlay = (dt: number) => {
      const totalFrames = frameUrls.length;
      if (!totalFrames) {
        return;
      }

      const { loopStart, loopEnd, loopLength } = getAutoPlayLoopBounds(totalFrames);

      if (!autoPlaying) {
        autoPlayExactFrame = progressToExactFrame(getScrollProgress(), totalFrames);
        autoPlaying = true;
      } else {
        autoPlayExactFrame += AUTO_PLAY_FPS * dt;
        if (autoPlayExactFrame > loopEnd) {
          autoPlayExactFrame =
            loopStart + ((autoPlayExactFrame - loopStart) % loopLength);
        }
      }

      frameProgress = exactFrameToProgress(autoPlayExactFrame, totalFrames);
    };

    const tick = (now: number) => {
      if (cancelled) {
        return;
      }

      if (!allFramesLoaded) {
        rafId = window.requestAnimationFrame(tick);
        return;
      }

      if (!lastTickTime) {
        lastTickTime = now;
      }

      const dt = Math.min((now - lastTickTime) / 1000, 0.05);
      lastTickTime = now;

      if (isScrollIdle()) {
        advanceAutoPlay(dt);
        renderFrame();
      }

      rafId = window.requestAnimationFrame(tick);
    };

    const setCanvasOpacity = (opacity: number) => {
      canvas.style.opacity = String(opacity);
    };

    const updateCanvasLoopFade = () => {
      setCanvasOpacity(getLoopFadeOpacity(frameProgress, frameUrls.length));
    };

    const resizeCanvas = () => {
      const rect = section.getBoundingClientRect();
      const width = Math.max(1, Math.floor(rect.width));
      const height = Math.max(1, Math.floor(rect.height));
      canvas.width = Math.floor(width * dpr);
      canvas.height = Math.floor(height * dpr);
      canvas.style.width = `${width}px`;
      canvas.style.height = `${height}px`;
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    };

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

      const img = await loadFrameImage(frameUrls[index]);
      if (img) {
        imageCache[index] = img;
      }
      return img;
    };

    const preloadAllFrames = async (): Promise<boolean> => {
      const results = await Promise.all(
        frameUrls.map((_url, index) => loadImageAt(index)),
      );
      return results.every(Boolean);
    };

    const showPosterFallback = () => {
      if (!posterUrl) {
        return;
      }

      resizeCanvas();
      ctx.clearRect(0, 0, canvas.width / dpr, canvas.height / dpr);
      const img = new Image();
      img.onload = () => {
        if (!cancelled) {
          drawCover(img);
        }
      };
      img.src = posterUrl;
    };

    const drawFrameSync = (progress: number) => {
      if (!frameUrls.length || !allFramesLoaded) {
        return;
      }

      const totalFrames = frameUrls.length;
      const exact = progressToExactFrame(progress, totalFrames);
      const idx = Math.floor(exact);
      const next = Math.min(idx + 1, totalFrames - 1);
      const blend = exact - idx;

      const imgA = imageCache[idx];
      const imgB = imageCache[next];
      if (!imgA) {
        showPosterFallback();
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

    const updateTextOverlay = (progress: number) => {
      if (headlineEl) {
        headlineEl.style.opacity = String(fadeInOut(progress, 0, 0.55, 0.75));
      }

      if (taglineEl) {
        taglineEl.style.opacity = String(fadeInOut(progress, 0.65, 0.78, 0.88));
      }

      if (ctaEl) {
        ctaEl.style.opacity = String(fadeInOut(progress, 0.68, 0.78, 0.88));
      }
    };

    const updateFromScroll = () => {
      if (cancelled || !allFramesLoaded) {
        return;
      }

      autoPlaying = false;
      frameProgress = getScrollProgress();
      renderFrame();
    };

    const startPlayback = () => {
      lastScrollTime = performance.now();
      lastTickTime = 0;
      updateFromScroll();
      rafId = window.requestAnimationFrame(tick);
      window.dispatchEvent(new CustomEvent("webme-sequence-hero-ready"));
    };

    const beginSequence = async (urls: string[]) => {
      frameUrls = urls;
      if (!frameUrls.length) {
        setLoadState("error");
        showPosterFallback();
        return;
      }

      const loaded = await preloadAllFrames();
      if (cancelled) {
        return;
      }

      if (!loaded) {
        setLoadState("error");
        showPosterFallback();
        return;
      }

      allFramesLoaded = true;
      setLoadState("ready");
      startPlayback();
    };

    const onScroll = () => {
      lastScrollTime = performance.now();
      updateFromScroll();
    };

    const onResize = () => {
      if (allFramesLoaded) {
        drawFrameSync(frameProgress);
      }
    };

    window.addEventListener("scroll", onScroll, { passive: true });
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
          setLoadState("error");
          showPosterFallback();
        }
      })
      .catch(() => {
        if (!cancelled) {
          setLoadState("error");
          showPosterFallback();
        }
      });

    return () => {
      cancelled = true;
      window.removeEventListener("scroll", onScroll);
      window.removeEventListener("resize", onResize);
      window.cancelAnimationFrame(rafId);
    };
  }, [sequenceId, posterUrl, resolvedHeadline, resolvedTagline, ctaLabel]);

  const showOverlay = Boolean(resolvedHeadline || resolvedTagline || ctaLabel);

  return (
    <section
      ref={sectionRef}
      id="webme-scroll-hero-external"
      className="relative w-full bg-black"
      style={{ height: `${getSequenceSectionHeightVh()}vh` }}
    >
      <style>{`
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
      <div className="sticky top-0 h-screen w-full overflow-hidden">
        <div className="absolute inset-0">
          <div
            className={`pointer-events-none absolute inset-0 z-0 bg-black/50 transition-opacity duration-700 ${
              loadState === "ready" ? "opacity-100" : "opacity-60"
            }`}
            aria-hidden
          />
          <div className="webme-sequence-canvas-ken-burns absolute inset-0 z-[1]">
            <canvas
              ref={canvasRef}
              className="block h-full w-full"
              style={{ opacity: LOOP_FADE_MAX_OPACITY }}
            />
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
            loadState === "ready" ? "opacity-100" : "opacity-0"
          }`}
        >
          {resolvedHeadline ? (
            <h1
              ref={headlineRef}
              className="font-serif text-4xl font-bold leading-tight text-white md:text-5xl"
              style={{ textShadow: HERO_TEXT_SHADOW, opacity: 0 }}
            >
              {resolvedHeadline}
            </h1>
          ) : null}
          {resolvedTagline ? (
            <p
              ref={taglineRef}
              className="max-w-2xl text-xl font-medium leading-relaxed text-white md:text-2xl"
              style={{ textShadow: HERO_TEXT_SHADOW, opacity: 0 }}
            >
              {resolvedTagline}
            </p>
          ) : null}
          {ctaLabel ? (
            <a
              ref={ctaRef}
              href={ctaHref}
              onClick={scrollToContactSection}
              className="pointer-events-auto mt-2 inline-block rounded px-10 py-4 text-base font-semibold text-neutral-900 no-underline transition hover:-translate-y-0.5"
              style={{
                background: "#ffffff",
                border: "2px solid #ffffff",
                boxShadow: HERO_TEXT_SHADOW,
                opacity: 0,
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
