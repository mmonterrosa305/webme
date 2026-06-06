const PEXELS_VIDEO_SEARCH = "https://api.pexels.com/videos/search";
const FALLBACK_QUERY = "small business";
const MIN_DURATION_SECONDS = 10;
const MAX_DURATION_SECONDS = 30;

type PexelsVideoFile = {
  id: number;
  quality: string;
  file_type: string;
  width: number;
  height: number;
  link: string;
};

type PexelsVideo = {
  id: number;
  width: number;
  height: number;
  duration: number;
  image: string;
  video_files: PexelsVideoFile[];
};

type PexelsSearchResponse = {
  videos?: PexelsVideo[];
};

function getPexelsApiKey(): string | null {
  const key = process.env.PEXELS_API_KEY?.trim();
  return key || null;
}

function pickHdLandscapeFile(
  video: PexelsVideo,
): PexelsVideoFile | undefined {
  return video.video_files
    .filter(
      (file) =>
        file.file_type === "video/mp4" &&
        file.quality === "hd" &&
        file.width >= file.height,
    )
    .sort(
      (a, b) =>
        Math.abs(a.width - 1920) - Math.abs(b.width - 1920) ||
        b.width - a.width,
    )[0];
}

function pickBestVideoUrl(videos: PexelsVideo[]): string | null {
  const inRange = videos.filter(
    (video) =>
      video.duration >= MIN_DURATION_SECONDS &&
      video.duration <= MAX_DURATION_SECONDS,
  );

  for (const video of inRange) {
    const file = pickHdLandscapeFile(video);
    if (file?.link) {
      return file.link;
    }
  }

  for (const video of videos) {
    const file = pickHdLandscapeFile(video);
    if (file?.link) {
      return file.link;
    }
  }

  return null;
}

async function searchPexelsVideos(query: string): Promise<string | null> {
  const apiKey = getPexelsApiKey();

  if (!apiKey) {
    return null;
  }

  const params = new URLSearchParams({
    query,
    orientation: "landscape",
    size: "medium",
    per_page: "15",
    min_duration: String(MIN_DURATION_SECONDS),
    max_duration: String(MAX_DURATION_SECONDS),
  });

  const response = await fetch(`${PEXELS_VIDEO_SEARCH}?${params.toString()}`, {
    headers: { Authorization: apiKey },
  });

  if (!response.ok) {
    return null;
  }

  const data = (await response.json()) as PexelsSearchResponse;
  return pickBestVideoUrl(data.videos ?? []);
}

/** Search Pexels for a landscape HD hero video matching the business industry. */
export async function fetchPexelsVideo(industry: string): Promise<string | null> {
  const query = industry.trim();

  if (!query) {
    return searchPexelsVideos(FALLBACK_QUERY);
  }

  const industryMatch = await searchPexelsVideos(query);

  if (industryMatch) {
    return industryMatch;
  }

  if (query.toLowerCase() === FALLBACK_QUERY) {
    return null;
  }

  return searchPexelsVideos(FALLBACK_QUERY);
}
