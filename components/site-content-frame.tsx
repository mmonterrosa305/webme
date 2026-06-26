"use client";

import { useCallback, useEffect, useRef } from "react";

type SiteContentFrameProps = {
  html: string;
  title: string;
  className?: string;
};

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

    const height = Math.max(
      doc.documentElement.scrollHeight,
      doc.body.scrollHeight,
      doc.documentElement.offsetHeight,
      doc.body.offsetHeight,
    );

    iframe.style.height = `${height}px`;
    iframe.style.overflow = "hidden";
  }, []);

  useEffect(() => {
    const iframe = iframeRef.current;
    if (!iframe) {
      return;
    }

    const onLoad = () => {
      resizeIframe();
      window.setTimeout(resizeIframe, 100);
      window.setTimeout(resizeIframe, 500);
      window.setTimeout(resizeIframe, 1500);
    };

    iframe.addEventListener("load", onLoad);
    return () => iframe.removeEventListener("load", onLoad);
  }, [html, resizeIframe]);

  useEffect(() => {
    const onResize = () => resizeIframe();
    window.addEventListener("resize", onResize);
    return () => window.removeEventListener("resize", onResize);
  }, [resizeIframe]);

  return (
    <iframe
      ref={iframeRef}
      title={title}
      srcDoc={html}
      sandbox="allow-scripts allow-same-origin"
      scrolling="no"
      className={`block border-0 bg-white ${className}`}
    />
  );
}
