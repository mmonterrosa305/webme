"use client";

import { useEffect, useRef, useState } from "react";

const PREVIEW_DESIGN_WIDTH = 1280;
const PREVIEW_DESIGN_HEIGHT = 900;

type PreviewPanelProps = {
  html: string | null;
  loading: boolean;
  siteSlug: string;
};

export function PreviewPanel({ html, loading, siteSlug }: PreviewPanelProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [scale, setScale] = useState(1);

  useEffect(() => {
    const container = containerRef.current;
    if (!container) {
      return;
    }

    function updateScale() {
      const width = container?.clientWidth ?? 0;
      const height = container?.clientHeight ?? 0;

      if (width === 0 || height === 0) {
        return;
      }

      const widthScale = width / PREVIEW_DESIGN_WIDTH;
      const heightScale = height / PREVIEW_DESIGN_HEIGHT;
      setScale(Math.min(widthScale, heightScale, 1));
    }

    updateScale();

    const observer = new ResizeObserver(updateScale);
    observer.observe(container);

    return () => observer.disconnect();
  }, []);

  return (
    <div className="flex h-full min-h-0 min-w-0 flex-col bg-neutral-200">
      <div className="flex h-11 shrink-0 items-center justify-between border-b border-neutral-300 bg-neutral-100 px-4">
        <span className="text-xs font-semibold uppercase tracking-wide text-neutral-600">
          Preview
        </span>
        <span className="truncate text-xs text-neutral-500">
          {loading ? "Updating…" : `/preview/${siteSlug}`}
        </span>
      </div>

      <div
        ref={containerRef}
        className="relative flex min-h-0 flex-1 items-center justify-center overflow-hidden p-5"
      >
        {loading ? (
          <div className="absolute inset-0 z-10 flex items-center justify-center bg-neutral-200/90 text-sm text-neutral-600">
            Updating preview…
          </div>
        ) : null}

        {html ? (
          <div
            className="overflow-hidden rounded-md border border-neutral-300 bg-white shadow-lg"
            style={{
              width: PREVIEW_DESIGN_WIDTH * scale,
              height: PREVIEW_DESIGN_HEIGHT * scale,
            }}
          >
            <iframe
              title="Site preview"
              srcDoc={html}
              sandbox="allow-scripts allow-same-origin"
              className="block border-0 bg-white"
              style={{
                width: PREVIEW_DESIGN_WIDTH,
                height: PREVIEW_DESIGN_HEIGHT,
                transform: `scale(${scale})`,
                transformOrigin: "top left",
              }}
            />
          </div>
        ) : (
          <p className="text-sm text-neutral-500">Preview will appear here</p>
        )}
      </div>
    </div>
  );
}
