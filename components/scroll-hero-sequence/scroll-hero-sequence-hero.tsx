"use client";

import { useEffect, useRef } from "react";
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

const TEXT_SCROLL_TRIGGER_ID = "webme-scroll-hero-text";
const HERO_TEXT_SHADOW = "0 2px 16px rgba(0, 0, 0, 0.65)";

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
  const sectionRef = useRef<HTMLElement>(null);
  const pinRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const headlineRef = useRef<HTMLHeadingElement>(null);
  const taglineRef = useRef<HTMLParagraphElement>(null);
  const ctaRef = useRef<HTMLAnchorElement>(null);

  useEffect(() => {
    console.log("[ScrollHeroSequenceHero] hero copy received:", {
      headline,
      tagline,
      businessName,
      resolvedHeadline,
      resolvedTagline,
      sequenceId,
    });
  }, [
    headline,
    tagline,
    businessName,
    resolvedHeadline,
    resolvedTagline,
    sequenceId,
  ]);

  useEffect(() => {
    const section = sectionRef.current;
    if (!section) {
      return;
    }

    const headlineEl = headlineRef.current;
    const taglineEl = taglineRef.current;
    const ctaEl = ctaRef.current;
    const textEls = [headlineEl, taglineEl, ctaEl].filter(Boolean) as HTMLElement[];

    if (!textEls.length) {
      return;
    }

    const ctx = gsap.context(() => {
      gsap.set(textEls, { opacity: 0, y: 40 });

      const tl = gsap.timeline({
        scrollTrigger: {
          id: TEXT_SCROLL_TRIGGER_ID,
          trigger: section,
          start: "top top",
          end: "bottom bottom",
          scrub: true,
        },
        defaults: { ease: "none" },
      });

      if (headlineEl) {
        tl.to(headlineEl, { opacity: 1, y: 0, duration: 0.2 }, 0);
        tl.to(headlineEl, { opacity: 0, y: -40, duration: 0.2 }, 0.6);
      }

      if (taglineEl) {
        tl.to(taglineEl, { opacity: 1, y: 0, duration: 0.15 }, 0.65);
        tl.to(taglineEl, { opacity: 0, y: -40, duration: 0.2 }, 0.8);
      }

      if (ctaEl) {
        tl.to(ctaEl, { opacity: 1, y: 0, duration: 0.15 }, 0.68);
        tl.to(ctaEl, { opacity: 0, y: -40, duration: 0.2 }, 0.8);
      }
    }, section);

    return () => {
      ctx.revert();
    };
  }, [resolvedHeadline, resolvedTagline, ctaLabel]);

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
    const imageCache: Record<number, HTMLImageElement> = {};
    const pendingLoads: Record<number, Promise<HTMLImageElement | null>> = {};
    const dpr = window.devicePixelRatio || 1;

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

    const drawFrame = (progress: number) => {
      if (!frameUrls.length) {
        return;
      }

      const maxIndex = frameUrls.length - 1;
      const exact = progress * maxIndex;
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

    const bindScrollHero = () => {
      ScrollTrigger.getById("webme-scroll-hero-pin")?.kill();
      ScrollTrigger.getById("webme-scroll-hero-scrub")?.kill();

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

      ScrollTrigger.create({
        id: "webme-scroll-hero-scrub",
        trigger: section,
        start: "top top",
        end: "bottom bottom",
        scrub: true,
        onUpdate: (self) => {
          drawFrame(self.progress);
        },
      });

      drawFrame(0);
      ScrollTrigger.refresh();
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
          bindScrollHero();
        } else {
          showPosterFallback();
        }
      });
      prefetchWindow(0);
    };

    const onResize = () => {
      const scrub = ScrollTrigger.getById("webme-scroll-hero-scrub");
      if (scrub) {
        drawFrame(scrub.progress);
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
      window.removeEventListener("resize", onResize);
      ScrollTrigger.getById("webme-scroll-hero-pin")?.kill();
      ScrollTrigger.getById("webme-scroll-hero-scrub")?.kill();
    };
  }, [sequenceId, posterUrl]);

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
        <canvas ref={canvasRef} className="absolute inset-0 block h-full w-full" />
        <div
          className="pointer-events-none absolute inset-0 bg-black/50"
          aria-hidden
        />
        {showOverlay ? (
          <div className="relative z-10 mx-auto flex w-full max-w-4xl flex-col items-center justify-center px-6 text-center text-white">
            {resolvedHeadline ? (
              <h1
                ref={headlineRef}
                className="font-serif text-4xl font-bold leading-tight text-white md:text-5xl"
                style={{ textShadow: HERO_TEXT_SHADOW }}
              >
                {resolvedHeadline}
              </h1>
            ) : null}
            {resolvedTagline ? (
              <p
                ref={taglineRef}
                className="mt-4 max-w-2xl text-xl font-medium leading-relaxed text-white md:text-2xl"
                style={{ textShadow: HERO_TEXT_SHADOW }}
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
