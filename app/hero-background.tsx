"use client";

import { useState, type ReactNode } from "react";

const FALLBACK_IMAGE =
  "https://images.unsplash.com/photo-1657886708649-eda40992a10f?auto=format&fit=crop&w=1920&q=80";

export function HeroBackground({ children }: { children: ReactNode }) {
  const [videoFailed, setVideoFailed] = useState(false);

  return (
    <section className="relative w-full overflow-hidden py-16 sm:py-24 lg:py-32">
      {videoFailed ? (
        <div
          className="absolute inset-0 bg-cover bg-center"
          style={{ backgroundImage: `url(${FALLBACK_IMAGE})` }}
          aria-hidden="true"
        />
      ) : (
        <video
          autoPlay
          loop
          muted
          playsInline
          className="absolute inset-0 h-full w-full object-cover"
          onError={() => setVideoFailed(true)}
        >
          <source src="/hero.mp4" type="video/mp4" />
        </video>
      )}
      <div
        className="absolute inset-0"
        style={{ backgroundColor: "rgba(0, 0, 0, 0.55)" }}
        aria-hidden="true"
      />
      <div className="relative mx-auto max-w-6xl px-4 sm:px-6 lg:px-8">
        {children}
      </div>
    </section>
  );
}
