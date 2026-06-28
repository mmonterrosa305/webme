import type { Metadata } from "next";

import { PageHeader } from "../_components/dashboard-ui";
import { VideoLibraryManager } from "./video-library-manager";
import { ImageSequenceLibrarySection } from "./image-sequence-library-section";

export const metadata: Metadata = {
  title: "Video Library — WebMe",
};

export default function VideoLibraryPage() {
  return (
    <main className="mx-auto max-w-6xl px-4 py-8 sm:px-6 lg:px-8 lg:py-10">
      <PageHeader
        eyebrow="Scroll animation"
        title="Video Library"
        description="Upload and manage preset scroll hero videos and canvas image sequences by industry. These appear when building sites with scroll animation enabled."
      />
      <VideoLibraryManager />
      <div className="mt-10">
        <PageHeader
          eyebrow="Scroll animation"
          title="Image Sequences"
          description="Accepts ZIP of JPG, PNG, or WebP frames for canvas-based scroll scrubbing on generated sites."
        />
        <ImageSequenceLibrarySection />
      </div>
    </main>
  );
}
