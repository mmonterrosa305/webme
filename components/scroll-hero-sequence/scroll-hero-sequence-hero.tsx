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

/** Skip washed-out opening frames — sequence starts at frame 81 (index 80). */
const START_FRAME_OFFSET = 80;
/** Steady cinematic playback rate. */
const AUTO_PLAY_FPS = 24;
/** Subtle Ken Burns zoom: 1 → 1.08 → 1 over a full cycle. */
const KEN_BURNS_SCALE_MAX = 1.08;
const KEN_BURNS_HALF_CYCLE_SEC = 8;

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

function getLoopBounds(totalFrames: number): {
  loopStart: number;
  loopEnd: number;
  loopLength: number;
} {
  const loopStart = totalFrames <= START_FRAME_OFFSET + 1 ? 0 : START_FRAME_OFFSET;
  const loopEnd = Math.max(loopStart, totalFrames - 1);
  return {
    loopStart,
    loopEnd,
    loopLength: loopEnd - loopStart + 1,
  };
}

/** Keep exact frame in [loopStart, loopStart + loopLength). */
function wrapExactFrame(
  frame: number,
  loopStart: number,
  loopLength: number,
): number {
  if (loopLength <= 0) {
    return loopStart;
  }

  let t = (frame - loopStart) % loopLength;
  if (t < 0) {
    t += loopLength;
  }
  return loopStart + t;
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

    let cancelled = false;
    let frameUrls: string[] = [];
    const imageCache: Record<number, HTMLImageElement> = {};
    const dpr = window.devicePixelRatio || 1;

    let exactFrame = START_FRAME_OFFSET;
    let lastTickTime = 0;
    let rafId = 0;
    let allFramesLoaded = false;

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

    const drawExactFrame = (frame: number) => {
      if (!frameUrls.length || !allFramesLoaded) {
        return;
      }

      const totalFrames = frameUrls.length;
      const { loopStart, loopEnd, loopLength } = getLoopBounds(totalFrames);
      const wrapped = wrapExactFrame(frame, loopStart, loopLength);
      const idx = Math.min(Math.floor(wrapped), loopEnd);
      const next = idx >= loopEnd ? loopStart : idx + 1;
      const blend = wrapped - idx;

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

    const advancePlayback = (dt: number) => {
      const totalFrames = frameUrls.length;
      if (!totalFrames) {
        return;
      }

      const { loopStart, loopLength } = getLoopBounds(totalFrames);
      exactFrame = wrapExactFrame(
        exactFrame + AUTO_PLAY_FPS * dt,
        loopStart,
        loopLength,
      );
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

      advancePlayback(dt);
      drawExactFrame(exactFrame);

      rafId = window.requestAnimationFrame(tick);
    };

    const startPlayback = () => {
      const totalFrames = frameUrls.length;
      const { loopStart } = getLoopBounds(totalFrames);
      exactFrame = loopStart;
      lastTickTime = 0;
      drawExactFrame(exactFrame);
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

    const onResize = () => {
      resizeCanvas();
      if (allFramesLoaded) {
        drawExactFrame(exactFrame);
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
      window.removeEventListener("resize", onResize);
      window.cancelAnimationFrame(rafId);
    };
  }, [sequenceId, posterUrl]);

  const showOverlay = Boolean(resolvedHeadline || resolvedTagline || ctaLabel);

  return (
    <section
      ref={sectionRef}
      id="webme-scroll-hero-external"
      className="relative h-screen w-full overflow-hidden bg-black"
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
      <div className="absolute inset-0">
        <div
          className={`pointer-events-none absolute inset-0 z-0 bg-black/50 transition-opacity duration-700 ${
            loadState === "ready" ? "opacity-100" : "opacity-60"
          }`}
          aria-hidden
        />
        <div className="absolute inset-0 z-[1] overflow-hidden">
          <div className="webme-sequence-canvas-ken-burns absolute inset-0">
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
            loadState === "ready" ? "opacity-100" : "opacity-0"
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
    </section>
  );
}
