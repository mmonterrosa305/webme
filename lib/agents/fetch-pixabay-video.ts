const PIXABAY_VIDEO_SEARCH = "https://pixabay.com/api/videos/";

function getPixabayApiKey(): string | null {
  const key = process.env.PIXABAY_API_KEY?.trim();
  return key || null;
}

export async function fetchPixabayVideo(industry: string): Promise<string | null> {
  const apiKey = getPixabayApiKey();
  if (!apiKey) return null;

  const queries = [industry];
  if (industry.toLowerCase().endsWith("ing")) {
    const stem = industry.toLowerCase().slice(0, -3);
    queries.push(`${stem}er`, `${stem}ers`);
  }

  const allUrls: string[] = [];

  for (const query of queries) {
    try {
      const params = new URLSearchParams({
        key: apiKey,
        q: query,
        video_type: "film",
        orientation: "horizontal",
        per_page: "30",
        safesearch: "true",
        order: "popular",
      });

      const response = await fetch(`${PIXABAY_VIDEO_SEARCH}?${params}`);
      if (!response.ok) continue;

      const data = await response.json() as {
        hits?: Array<{
          duration?: number;
          videos?: {
            large?: { url?: string; width?: number; height?: number };
            medium?: { url?: string; width?: number; height?: number };
          };
        }>;
      };

      for (const hit of data.hits ?? []) {
        if (!hit.duration || hit.duration < 10 || hit.duration > 30) continue;
        const video = hit.videos?.large?.url && (hit.videos.large.width ?? 0) >= (hit.videos.large.height ?? 0)
          ? hit.videos.large.url
          : hit.videos?.medium?.url;
        if (video) allUrls.push(video);
      }
    } catch {
      continue;
    }
  }

  if (allUrls.length === 0) return null;
  return allUrls[Math.floor(Math.random() * allUrls.length)];
}
