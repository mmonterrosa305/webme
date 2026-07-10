"use client";

import { ScrollHeroSequenceHero } from "@/components/scroll-hero-sequence/scroll-hero-sequence-hero";

type ScrollHeroSequenceHeroWrapperProps = {
  sequenceId: string;
  businessName?: string;
  posterUrl?: string;
  headline?: string;
  tagline?: string;
  ctaLabel?: string;
  ctaHref?: string;
};

export default function ScrollHeroSequenceHeroWrapper(
  props: ScrollHeroSequenceHeroWrapperProps,
) {
  return <ScrollHeroSequenceHero {...props} />;
}
