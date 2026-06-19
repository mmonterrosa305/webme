import type { Metadata } from "next";

import { PageHeader } from "../_components/dashboard-ui";
import { VideoLibraryManager } from "./video-library-manager";

export const metadata: Metadata = {
  title: "Video Library — WebMe",
};

export default function VideoLibraryPage() {
  return (
    <main className="mx-auto max-w-6xl px-4 py-8 sm:px-6 lg:px-8 lg:py-10">
      <PageHeader
        eyebrow="Scroll animation"
        title="Video Library"
        description="Upload and manage preset scroll hero videos by industry. These appear as selectable options when building sites with scroll animation enabled."
      />
      <VideoLibraryManager />
    </main>
  );
}
