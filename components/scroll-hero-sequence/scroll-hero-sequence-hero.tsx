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

type LoadState = "loading" | "ready" | "error";

const HERO_TEXT_SHADOW = "0 2px 16px rgba(0, 0, 0, 0.65)";

const BASE_PLAYBACK_FPS = 24;
const SCROLL_VELOCITY_SCALE = 0.012;
const PLAYBACK_RATE_LERP = 0.1;
const SCROLL_IDLE_MS = 140;
const MAX_SPEED_MULTIPLIER = 5;
const LOOP_FADE_DURATION = 0.8;
const BOUNDARY_EPSILON = 0.0001;

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
  const [loadState, setLoadState] = useState<LoadState>("loading");

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
    const dpr = window.devicePixelRatio || 1;

    let frameProgress = 0;
    let playbackRate = 0;
    let targetPlaybackRate = 0;
    let baseProgressPerSecond = 0;
    let lastFrameTime = 0;
    let rafId = 0;
    let scrollIdleTimer = 0;
    let lastScrollY = window.scrollY;
    let isScrolling = false;
    let allFramesLoaded = false;
    let isLoopTransitioning = false;
    let loopTimeline: gsap.core.Timeline | null = null;

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

      return new Promise((resolve) => {
        const img = new Image();
        img.decoding = "async";
        img.onload = () => {
          imageCache[index] = img;
          resolve(img);
        };
        img.onerror = () => {
          resolve(null);
        };
        img.src = frameUrls[index];
      });
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

      const maxIndex = frameUrls.length - 1;
      const exact = clamp(progress, 0, 1) * maxIndex;
      const idx = Math.floor(exact);
      const next = Math.min(idx + 1, maxIndex);
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

    const getIdlePlaybackRate = (): number => {
      return baseProgressPerSecond;
    };

    const runLoopTransition = (newProgress: number) => {
      if (isLoopTransitioning || cancelled) {
        return;
      }

      isLoopTransitioning = true;
      playbackRate = 0;
      targetPlaybackRate = isScrolling ? targetPlaybackRate : baseProgressPerSecond;

      loopTimeline?.kill();
      gsap.set(canvas, { opacity: 1 });

      loopTimeline = gsap.timeline({
        onComplete: () => {
          if (cancelled) {
            return;
          }

          gsap.set(canvas, { opacity: 1 });
          isLoopTransitioning = false;

          if (!isScrolling) {
            targetPlaybackRate = baseProgressPerSecond;
          }
        },
      });

      loopTimeline
        .to(canvas, {
          opacity: 0,
          duration: LOOP_FADE_DURATION,
          ease: "power2.inOut",
        })
        .call(() => {
          if (cancelled) {
            return;
          }

          frameProgress = newProgress;
          drawFrameSync(frameProgress);
          updateTextOverlay(frameProgress);
        })
        .to(canvas, {
          opacity: 1,
          duration: LOOP_FADE_DURATION,
          ease: "power2.inOut",
        });
    };

    const tick = (now: number) => {
      if (cancelled || !allFramesLoaded) {
        return;
      }

      if (isLoopTransitioning) {
        rafId = window.requestAnimationFrame(tick);
        return;
      }

      if (!lastFrameTime) {
        lastFrameTime = now;
      }

      const dt = Math.min((now - lastFrameTime) / 1000, 0.05);
      lastFrameTime = now;

      if (!isScrolling) {
        targetPlaybackRate = lerp(
          targetPlaybackRate,
          getIdlePlaybackRate(),
          PLAYBACK_RATE_LERP,
        );
      }

      playbackRate = lerp(playbackRate, targetPlaybackRate, PLAYBACK_RATE_LERP);

      const nextProgress = frameProgress + playbackRate * dt;

      if (nextProgress >= 1 && playbackRate > BOUNDARY_EPSILON) {
        frameProgress = 1;
        drawFrameSync(frameProgress);
        updateTextOverlay(frameProgress);
        runLoopTransition(0);
        rafId = window.requestAnimationFrame(tick);
        return;
      }

      if (nextProgress <= 0 && playbackRate < -BOUNDARY_EPSILON) {
        frameProgress = 0;
        drawFrameSync(frameProgress);
        updateTextOverlay(frameProgress);
        runLoopTransition(1);
        rafId = window.requestAnimationFrame(tick);
        return;
      }

      frameProgress = clamp(nextProgress, 0, 1);
      drawFrameSync(frameProgress);
      updateTextOverlay(frameProgress);

      rafId = window.requestAnimationFrame(tick);
    };

    const onScroll = () => {
      if (cancelled || !allFramesLoaded || isLoopTransitioning) {
        return;
      }

      const currentScrollY = window.scrollY;
      const scrollDelta = currentScrollY - lastScrollY;
      lastScrollY = currentScrollY;
      isScrolling = true;

      const velocityBoost = scrollDelta * SCROLL_VELOCITY_SCALE;
      const minRate = -baseProgressPerSecond * MAX_SPEED_MULTIPLIER;
      const maxRate = baseProgressPerSecond * MAX_SPEED_MULTIPLIER;
      targetPlaybackRate = clamp(velocityBoost, minRate, maxRate);

      window.clearTimeout(scrollIdleTimer);
      scrollIdleTimer = window.setTimeout(() => {
        isScrolling = false;
        targetPlaybackRate = getIdlePlaybackRate();
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
      playbackRate = 0;
      targetPlaybackRate = baseProgressPerSecond;
      lastScrollY = window.scrollY;
      lastFrameTime = 0;
      isScrolling = false;

      updateTextOverlay(0);
      bindPin();
      drawFrameSync(0);

      window.dispatchEvent(new CustomEvent("webme-sequence-hero-ready"));
      rafId = window.requestAnimationFrame(tick);
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
      window.clearTimeout(scrollIdleTimer);
      window.cancelAnimationFrame(rafId);
      loopTimeline?.kill();
      ScrollTrigger.getById("webme-scroll-hero-pin")?.kill();
    };
  }, [sequenceId, posterUrl, resolvedHeadline, resolvedTagline, ctaLabel]);

  const showOverlay = Boolean(resolvedHeadline || resolvedTagline || ctaLabel);

  return (
    <section
      ref={sectionRef}
      id="webme-scroll-hero-external"
      className="relative h-[400vh] w-full"
    >
      <div
        ref={pinRef}
        className="relative flex h-screen w-full items-center justify-center overflow-hidden"
      >
        <canvas
          ref={canvasRef}
          className={`absolute inset-0 block h-full w-full transition-opacity duration-700 ${
            loadState === "ready" ? "opacity-100" : "opacity-0"
          }`}
        />
        <div
          className={`pointer-events-none absolute inset-0 bg-black/50 transition-opacity duration-700 ${
            loadState === "ready" ? "opacity-100" : "opacity-60"
          }`}
          aria-hidden
        />
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
        {showOverlay ? (
          <div
            className={`relative z-10 mx-auto flex w-full max-w-4xl flex-col items-center justify-center px-6 pt-24 text-center text-white transition-opacity duration-700 ${
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
