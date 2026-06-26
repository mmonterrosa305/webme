"use client";

import { useEffect, useRef, useState } from "react";
import { gsap } from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";

gsap.registerPlugin(ScrollTrigger);

type ScrollHeroSequenceHeroProps = {
  sequenceId: string;
  businessName?: string;
  posterUrl?: string;
  headline?: string;
  tagline?: string;
  ctaLabel?: string;
  ctaHref?: string;
};

const HERO_TEXT_SHADOW = "0 2px 16px rgba(0, 0, 0, 0.65)";

const BASE_PLAYBACK_FPS = 24;
const SCROLL_VELOCITY_SCALE = 0.004;
const PLAYBACK_RATE_LERP = 0.1;
const SCROLL_IDLE_MS = 140;
const MAX_SPEED_MULTIPLIER = 5;
const REVERSE_SPEED_MULTIPLIER = 0.45;

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

function slideY(
  progress: number,
  fadeInEnd: number,
  holdEnd: number,
  fadeOutEnd: number,
  fromY: number,
  toY: number,
): number {
  const opacity = fadeInOut(progress, fadeInEnd, holdEnd, fadeOutEnd);
  if (progress <= fadeInEnd) {
    const t = segmentProgress(progress, 0, fadeInEnd);
    return lerp(fromY, toY, t);
  }
  if (progress <= holdEnd) {
    return toY;
  }
  if (progress <= fadeOutEnd) {
    const t = segmentProgress(progress, holdEnd, fadeOutEnd);
    return lerp(toY, -fromY, t);
  }
  return -fromY;
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
  const [sequenceComplete, setSequenceComplete] = useState(false);

  const sectionRef = useRef<HTMLElement>(null);
  const pinRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const headlineRef = useRef<HTMLHeadingElement>(null);
  const taglineRef = useRef<HTMLParagraphElement>(null);
  const ctaRef = useRef<HTMLAnchorElement>(null);

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

    const headlineEl = headlineRef.current;
    const taglineEl = taglineRef.current;
    const ctaEl = ctaRef.current;

    let cancelled = false;
    let frameUrls: string[] = [];
    const imageCache: Record<number, HTMLImageElement> = {};
    const pendingLoads: Record<number, Promise<HTMLImageElement | null>> = {};
    const dpr = window.devicePixelRatio || 1;

    let frameProgress = 0;
    let playbackRate = 0;
    let targetPlaybackRate = 0;
    let baseProgressPerSecond = 0;
    let lastFrameTime = 0;
    let rafId = 0;
    let scrollIdleTimer = 0;
    let lastScrollY = window.scrollY;
    let finished = false;

    const resizeCanvas = () => {
      const rect = pin.getBoundingClientRect();
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

    const loadImageAt = (index: number): Promise<HTMLImageElement | null> => {
      if (index < 0 || index >= frameUrls.length) {
        return Promise.resolve(null);
      }
      if (imageCache[index]) {
        return Promise.resolve(imageCache[index]);
      }
      if (index in pendingLoads) {
        return pendingLoads[index]!;
      }

      pendingLoads[index] = new Promise((resolve) => {
        const img = new Image();
        img.decoding = "async";
        img.onload = () => {
          imageCache[index] = img;
          delete pendingLoads[index];
          resolve(img);
        };
        img.onerror = () => {
          delete pendingLoads[index];
          resolve(null);
        };
        img.src = frameUrls[index];
      });

      return pendingLoads[index];
    };

    const prefetchWindow = (centerIndex: number) => {
      const start = Math.max(0, centerIndex - 2);
      const end = Math.min(frameUrls.length - 1, centerIndex + 4);
      for (let i = start; i <= end; i++) {
        void loadImageAt(i);
      }
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

    const updateTextOverlay = (progress: number) => {
      if (headlineEl) {
        gsap.set(headlineEl, {
          opacity: fadeInOut(progress, 0, 0.55, 0.75),
          y: slideY(progress, 0.2, 0.55, 0.75, 40, 0),
        });
      }

      if (taglineEl) {
        gsap.set(taglineEl, {
          opacity: fadeInOut(progress, 0.65, 0.78, 0.88),
          y: slideY(progress, 0.72, 0.78, 0.88, 40, 0),
        });
      }

      if (ctaEl) {
        gsap.set(ctaEl, {
          opacity: fadeInOut(progress, 0.68, 0.78, 0.88),
          y: slideY(progress, 0.74, 0.78, 0.88, 40, 0),
        });
      }
    };

    const drawFrame = (progress: number) => {
      if (!frameUrls.length) {
        return;
      }

      const maxIndex = frameUrls.length - 1;
      const exact = clamp(progress, 0, 1) * maxIndex;
      const idx = Math.floor(exact);
      const next = Math.min(idx + 1, maxIndex);
      const blend = exact - idx;
      prefetchWindow(idx);

      void loadImageAt(idx).then((imgA) => {
        if (cancelled) {
          return;
        }
        if (!imgA) {
          showPosterFallback();
          return;
        }

        resizeCanvas();
        ctx.clearRect(0, 0, canvas.width / dpr, canvas.height / dpr);
        drawCover(imgA);

        if (blend > 0.001 && next !== idx) {
          void loadImageAt(next).then((imgB) => {
            if (cancelled || !imgB) {
              return;
            }
            ctx.globalAlpha = blend;
            drawCover(imgB);
            ctx.globalAlpha = 1;
          });
        }
      });
    };

    const completeSequence = () => {
      if (finished || cancelled) {
        return;
      }

      finished = true;
      frameProgress = 1;
      playbackRate = 0;
      targetPlaybackRate = 0;
      drawFrame(1);
      updateTextOverlay(1);

      ScrollTrigger.getById("webme-scroll-hero-pin")?.kill();
      setSequenceComplete(true);
      window.cancelAnimationFrame(rafId);

      requestAnimationFrame(() => {
        ScrollTrigger.refresh();
      });
    };

    const tick = (now: number) => {
      if (cancelled || finished) {
        return;
      }

      if (!lastFrameTime) {
        lastFrameTime = now;
      }

      const dt = Math.min((now - lastFrameTime) / 1000, 0.05);
      lastFrameTime = now;

      playbackRate = lerp(playbackRate, targetPlaybackRate, PLAYBACK_RATE_LERP);
      frameProgress = clamp(frameProgress + playbackRate * dt, 0, 1);

      drawFrame(frameProgress);
      updateTextOverlay(frameProgress);

      if (frameProgress >= 1) {
        completeSequence();
        return;
      }

      rafId = window.requestAnimationFrame(tick);
    };

    const onScroll = () => {
      if (finished || cancelled) {
        return;
      }

      const currentScrollY = window.scrollY;
      const scrollDelta = currentScrollY - lastScrollY;
      lastScrollY = currentScrollY;

      const velocityBoost = scrollDelta * SCROLL_VELOCITY_SCALE;
      const minRate = -baseProgressPerSecond * REVERSE_SPEED_MULTIPLIER;
      const maxRate = baseProgressPerSecond * MAX_SPEED_MULTIPLIER;
      targetPlaybackRate = clamp(
        baseProgressPerSecond + velocityBoost,
        minRate,
        maxRate,
      );

      window.clearTimeout(scrollIdleTimer);
      scrollIdleTimer = window.setTimeout(() => {
        targetPlaybackRate = baseProgressPerSecond;
      }, SCROLL_IDLE_MS);
    };

    const bindPin = () => {
      ScrollTrigger.getById("webme-scroll-hero-pin")?.kill();

      ScrollTrigger.create({
        id: "webme-scroll-hero-pin",
        trigger: section,
        start: "top top",
        end: "bottom bottom",
        pin: pin,
        pinSpacing: false,
        anticipatePin: 1,
        invalidateOnRefresh: true,
      });

      ScrollTrigger.refresh();
    };

    const startPlayback = () => {
      baseProgressPerSecond =
        frameUrls.length > 0 ? BASE_PLAYBACK_FPS / frameUrls.length : 0.4;
      playbackRate = baseProgressPerSecond;
      targetPlaybackRate = baseProgressPerSecond;
      lastScrollY = window.scrollY;
      lastFrameTime = 0;

      updateTextOverlay(0);
      bindPin();
      drawFrame(0);

      window.dispatchEvent(new CustomEvent("webme-sequence-hero-ready"));
      rafId = window.requestAnimationFrame(tick);
    };

    const beginSequence = (urls: string[]) => {
      frameUrls = urls;
      if (!frameUrls.length) {
        showPosterFallback();
        return;
      }

      void loadImageAt(0).then((img) => {
        if (cancelled) {
          return;
        }
        if (img) {
          startPlayback();
        } else {
          showPosterFallback();
        }
      });
      prefetchWindow(0);
    };

    const onResize = () => {
      if (!finished) {
        drawFrame(frameProgress);
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
          beginSequence(data.frames_urls);
        } else {
          showPosterFallback();
        }
      })
      .catch(() => {
        if (!cancelled) {
          showPosterFallback();
        }
      });

    return () => {
      cancelled = true;
      window.removeEventListener("scroll", onScroll);
      window.removeEventListener("resize", onResize);
      window.clearTimeout(scrollIdleTimer);
      window.cancelAnimationFrame(rafId);
      ScrollTrigger.getById("webme-scroll-hero-pin")?.kill();
    };
  }, [sequenceId, posterUrl, resolvedHeadline, resolvedTagline, ctaLabel]);

  const showOverlay = Boolean(resolvedHeadline || resolvedTagline || ctaLabel);

  return (
    <section
      ref={sectionRef}
      id="webme-scroll-hero-external"
      className={`relative w-full ${sequenceComplete ? "h-screen" : "h-[400vh]"}`}
    >
      <div
        ref={pinRef}
        className="relative flex h-screen w-full items-center justify-center overflow-hidden"
      >
        <canvas ref={canvasRef} className="absolute inset-0 block h-full w-full" />
        <div
          className="pointer-events-none absolute inset-0 bg-black/50"
          aria-hidden
        />
        {showOverlay ? (
          <div className="relative z-10 mx-auto flex w-full max-w-4xl flex-col items-center justify-center px-6 pt-24 text-center text-white">
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
                className="mt-4 max-w-2xl text-xl font-medium leading-relaxed text-white md:text-2xl"
                style={{ textShadow: HERO_TEXT_SHADOW, opacity: 0 }}
              >
                {resolvedTagline}
              </p>
            ) : null}
            {ctaLabel ? (
              <a
                ref={ctaRef}
                href={ctaHref}
                className="pointer-events-auto mt-8 inline-block rounded px-10 py-4 text-base font-semibold text-neutral-900 no-underline transition hover:-translate-y-0.5"
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
