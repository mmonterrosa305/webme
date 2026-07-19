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
 * Uses ResizeObserver (not a fixed timeout cascade) so height updates only when
 * content actually changes — avoids rapid white/grey flicker during video load.
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

    const attachObservers = () => {
      const doc = iframe.contentDocument;
      if (!doc?.body) {
        return;
      }

      disconnectObservers();

      // Dark canvas while video/poster resolve — matches hero #000, avoids white flash.
      doc.documentElement.style.backgroundColor = "#000";
      doc.body.style.backgroundColor = "#000";

      if (!doc.getElementById("webme-iframe-video-bg")) {
        const style = doc.createElement("style");
        style.id = "webme-iframe-video-bg";
        style.textContent = `
          video[data-webme="hero-image"],
          video[data-webme-scroll-hero="true"],
          #webme-scroll-hero {
            background-color: #000 !important;
          }
        `;
        doc.head.appendChild(style);
      }

      resizeIframe();

      resizeObserver = new ResizeObserver(() => {
        resizeIframe();
      });
      resizeObserver.observe(doc.documentElement);
      resizeObserver.observe(doc.body);

      mutationObserver = new MutationObserver(() => {
        resizeIframe();
      });
      mutationObserver.observe(doc.documentElement, {
        childList: true,
        subtree: true,
        attributes: true,
        attributeFilter: ["style", "class", "src", "poster"],
      });

      // Single late pass for assets that don't reliably fire resize (e.g. video metadata).
      if (safetyTimer !== null) {
        window.clearTimeout(safetyTimer);
      }
      safetyTimer = window.setTimeout(resizeIframe, 1200);
    };

    iframe.addEventListener("load", attachObservers);
    if (iframe.contentDocument?.readyState === "complete") {
      attachObservers();
    }

    const onWindowResize = () => resizeIframe();
    window.addEventListener("resize", onWindowResize);

    return () => {
      iframe.removeEventListener("load", attachObservers);
      window.removeEventListener("resize", onWindowResize);
      disconnectObservers();
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
