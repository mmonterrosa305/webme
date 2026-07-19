"use client";

import { useCallback, useEffect, useRef } from "react";

type SiteContentFrameProps = {
  html: string;
  title: string;
  className?: string;
};

function measureContentHeight(doc: Document): number {
  return Math.max(
    doc.documentElement.scrollHeight,
    doc.body.scrollHeight,
    doc.documentElement.offsetHeight,
    doc.body.offsetHeight,
  );
}

/**
 * Autoresizing iframe for full generated sites.
 *
 * Important: generated heroes use `100vh`, which is relative to the *iframe*
 * viewport. If we set iframe height = content height, 100vh grows with the
 * iframe (runaway expansion) and the hero video often paints as solid black.
 * Lock vh-based hero heights to the parent window's innerHeight first.
 */
export function SiteContentFrame({
  html,
  title,
  className = "w-full",
}: SiteContentFrameProps) {
  const iframeRef = useRef<HTMLIFrameElement>(null);

  const resizeIframe = useCallback(() => {
    const iframe = iframeRef.current;
    const doc = iframe?.contentDocument;
    if (!iframe || !doc?.body) {
      return;
    }

    const height = measureContentHeight(doc);
    const next = `${height}px`;
    if (iframe.style.height !== next) {
      iframe.style.height = next;
    }
    iframe.style.overflow = "hidden";
  }, []);

  useEffect(() => {
    const iframe = iframeRef.current;
    if (!iframe) {
      return;
    }

    let resizeObserver: ResizeObserver | null = null;
    let mutationObserver: MutationObserver | null = null;
    let safetyTimer: number | null = null;

    const disconnectObservers = () => {
      resizeObserver?.disconnect();
      mutationObserver?.disconnect();
      resizeObserver = null;
      mutationObserver = null;
    };

    const lockHeroViewportUnits = (doc: Document) => {
      // Parent viewport — NOT the iframe's (which grows with content height).
      const vh = Math.max(1, Math.round(window.innerHeight));
      const isScrubHero = Boolean(doc.getElementById("webme-scroll-hero-init"));
      // Scrub runway is 100vh pin + 300vh scroll distance (see scroll-hero-video.ts).
      const sectionVh = isScrubHero ? vh * 4 : vh;

      let style = doc.getElementById(
        "webme-iframe-vh-lock",
      ) as HTMLStyleElement | null;
      if (!style) {
        style = doc.createElement("style");
        style.id = "webme-iframe-vh-lock";
        doc.head.appendChild(style);
      }
      style.textContent = `
        #webme-scroll-hero,
        #webme-scroll-hero.hero,
        .webme-scroll-hero-section {
          height: ${sectionVh}px !important;
          min-height: ${sectionVh}px !important;
          max-height: none !important;
        }
        .webme-scroll-hero-pin {
          height: ${vh}px !important;
          min-height: ${vh}px !important;
          max-height: ${vh}px !important;
        }
        video[data-webme="hero-image"],
        video[data-webme-scroll-hero="true"] {
          background-color: #000 !important;
        }
      `;
    };

    const ensureHeroVideoPlays = (doc: Document) => {
      const video = doc.querySelector(
        '#webme-scroll-hero video[data-webme="hero-image"], video[data-webme-scroll-hero="true"]',
      ) as HTMLVideoElement | null;
      if (!video) {
        return;
      }

      video.muted = true;
      video.defaultMuted = true;
      video.playsInline = true;
      video.setAttribute("muted", "");
      video.setAttribute("playsinline", "");

      const isScrubHero = Boolean(doc.getElementById("webme-scroll-hero-init"));

      // Scrub heroes are paused and driven by scroll — don't force autoplay.
      if (isScrubHero) {
        return;
      }

      video.setAttribute("autoplay", "");

      const tryPlay = () => {
        const playPromise = video.play();
        if (playPromise && typeof playPromise.catch === "function") {
          playPromise.catch(() => {
            // Autoplay can still be blocked; poster/first frame should show.
          });
        }
      };

      if (video.readyState >= 2) {
        tryPlay();
      } else {
        video.addEventListener("loadeddata", tryPlay, { once: true });
        video.addEventListener("canplay", tryPlay, { once: true });
        tryPlay();
      }
    };

    /** Map parent-page scroll onto scrub video time (iframe itself doesn't scroll). */
    const bindParentScrollScrub = (doc: Document) => {
      const video = doc.querySelector(
        'video[data-webme-scroll-hero="true"]',
      ) as HTMLVideoElement | null;
      if (!video || !doc.getElementById("webme-scroll-hero-init")) {
        return () => {};
      }

      const vh = Math.max(1, Math.round(window.innerHeight));
      const scrollable = vh * 3; // 300vh pin scroll distance

      const onScroll = () => {
        if (!video.duration || !Number.isFinite(video.duration)) {
          return;
        }
        const iframeTop = iframe.getBoundingClientRect().top;
        const progress = Math.min(
          1,
          Math.max(0, -iframeTop / scrollable),
        );
        const targetTime = progress * video.duration;
        if (Math.abs(video.currentTime - targetTime) > 0.03) {
          video.currentTime = targetTime;
        }
      };

      // Show first frame once metadata is ready.
      const showFirstFrame = () => {
        if (video.readyState >= 1 && video.currentTime === 0) {
          try {
            video.currentTime = 0.001;
          } catch {
            // ignore
          }
        }
        onScroll();
      };
      video.addEventListener("loadedmetadata", showFirstFrame, { once: true });
      if (video.readyState >= 1) {
        showFirstFrame();
      }

      window.addEventListener("scroll", onScroll, { passive: true });
      onScroll();
      return () => window.removeEventListener("scroll", onScroll);
    };

    let unbindScrub: (() => void) | null = null;

    const attachObservers = () => {
      const doc = iframe.contentDocument;
      if (!doc?.body) {
        return;
      }

      disconnectObservers();
      unbindScrub?.();
      unbindScrub = null;

      // Neutral page chrome while content paints (hero itself stays dark).
      doc.documentElement.style.backgroundColor = "#000";
      doc.body.style.backgroundColor = "#000";

      lockHeroViewportUnits(doc);
      ensureHeroVideoPlays(doc);
      unbindScrub = bindParentScrollScrub(doc);
      resizeIframe();

      resizeObserver = new ResizeObserver(() => {
        resizeIframe();
      });
      resizeObserver.observe(doc.documentElement);
      resizeObserver.observe(doc.body);

      // Avoid attributeFilter on video src/poster — those churn during load
      // and aren't needed for height once vh is locked to parent pixels.
      mutationObserver = new MutationObserver(() => {
        resizeIframe();
      });
      mutationObserver.observe(doc.body, {
        childList: true,
        subtree: true,
      });

      if (safetyTimer !== null) {
        window.clearTimeout(safetyTimer);
      }
      safetyTimer = window.setTimeout(() => {
        lockHeroViewportUnits(doc);
        ensureHeroVideoPlays(doc);
        resizeIframe();
      }, 800);
    };

    iframe.addEventListener("load", attachObservers);
    if (iframe.contentDocument?.readyState === "complete") {
      attachObservers();
    }

    const onWindowResize = () => {
      const doc = iframe.contentDocument;
      if (doc?.body) {
        lockHeroViewportUnits(doc);
      }
      resizeIframe();
    };
    window.addEventListener("resize", onWindowResize);

    return () => {
      iframe.removeEventListener("load", attachObservers);
      window.removeEventListener("resize", onWindowResize);
      disconnectObservers();
      unbindScrub?.();
      if (safetyTimer !== null) {
        window.clearTimeout(safetyTimer);
      }
    };
  }, [html, resizeIframe]);

  return (
    <iframe
      ref={iframeRef}
      title={title}
      srcDoc={html}
      sandbox="allow-scripts allow-same-origin"
      scrolling="no"
      className={`block border-0 bg-black ${className}`}
    />
  );
}
