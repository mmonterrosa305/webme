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
  const urls: string[] = [];
  const inRange = videos.filter(
    (video) =>
      video.duration >= MIN_DURATION_SECONDS &&
      video.duration <= MAX_DURATION_SECONDS,
  );

  for (const video of inRange) {
    const file = pickHdLandscapeFile(video);
    if (file?.link) {
      urls.push(file.link);
    }
  }

  if (urls.length === 0) {
    for (const video of videos) {
      const file = pickHdLandscapeFile(video);
      if (file?.link) {
        urls.push(file.link);
      }
    }
  }

  if (urls.length === 0) {
    return null;
  }

  return urls[Math.floor(Math.random() * urls.length)];
}

async function searchPexelsVideos(query: string): Promise<string[]> {
  const apiKey = getPexelsApiKey();

  if (!apiKey) {
    return [];
  }

  const params = new URLSearchParams({
    query,
    orientation: "landscape",
    size: "medium",
    per_page: "30",
    min_duration: String(MIN_DURATION_SECONDS),
    max_duration: String(MAX_DURATION_SECONDS),
  });

  const response = await fetch(`${PEXELS_VIDEO_SEARCH}?${params.toString()}`, {
    headers: { Authorization: apiKey },
  });

  if (!response.ok) {
    return [];
  }

  const data = (await response.json()) as PexelsSearchResponse;
  const urls: string[] = [];
  const inRange = (data.videos ?? []).filter(
    (video) =>
      video.duration >= MIN_DURATION_SECONDS &&
      video.duration <= MAX_DURATION_SECONDS,
  );

  for (const video of inRange) {
    const file = pickHdLandscapeFile(video);
    if (file?.link) {
      urls.push(file.link);
    }
  }

  if (urls.length === 0) {
    for (const video of data.videos ?? []) {
      const file = pickHdLandscapeFile(video);
      if (file?.link) {
        urls.push(file.link);
      }
    }
  }

  return urls;
}

/** Search Pexels for a landscape HD hero video matching the business industry. */
export async function fetchPexelsVideo(industry: string): Promise<string | null> {
  const query = industry.trim();

  if (!query) {
    const fallbackUrls = await searchPexelsVideos(FALLBACK_QUERY);
    return fallbackUrls.length > 0
      ? fallbackUrls[Math.floor(Math.random() * fallbackUrls.length)]
      : null;
  }

  const queries = [query];
  if (query.toLowerCase().endsWith("ing")) {
    const stem = query.toLowerCase().slice(0, -3);
    queries.push(`${stem}er`, `${stem}ers`);
  }

  const allUrls: string[] = [];

  for (const searchQuery of [...new Set(queries)]) {
    const urls = await searchPexelsVideos(searchQuery);
    allUrls.push(...urls);
  }

  if (allUrls.length > 0) {
    return allUrls[Math.floor(Math.random() * allUrls.length)];
  }

  if (query.toLowerCase() === FALLBACK_QUERY) {
    return null;
  }

  const fallbackUrls = await searchPexelsVideos(FALLBACK_QUERY);
  return fallbackUrls.length > 0
    ? fallbackUrls[Math.floor(Math.random() * fallbackUrls.length)]
    : null;
}
