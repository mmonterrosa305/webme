export type WeeklyIndustryContent = {
  news_headline: string;
  news_body: string;
  tip_headline: string;
  tip_body: string;
};

const FALLBACK_CONTENT: WeeklyIndustryContent = {
  news_headline: "Local businesses are investing more in their online presence",
  news_body:
    "Small businesses across the country are seeing stronger results from websites that make it easy for customers to call, book, or request a quote. A clear online presence continues to be one of the most reliable ways to stay top of mind in your market.",
  tip_headline: "Tip of the week",
  tip_body:
    "Share your website link in your email signature, Google Business Profile, and social bios. Consistent visibility makes it easier for repeat customers and referrals to find you when they are ready to buy.",
};

function parseIndustryContent(text: string): WeeklyIndustryContent | null {
  const trimmed = text.trim();
  const jsonMatch = trimmed.match(/\{[\s\S]*\}/);

  if (!jsonMatch) {
    return null;
  }

  try {
    const parsed = JSON.parse(jsonMatch[0]) as Partial<WeeklyIndustryContent>;

    if (
      typeof parsed.news_headline === "string" &&
      typeof parsed.news_body === "string" &&
      typeof parsed.tip_headline === "string" &&
      typeof parsed.tip_body === "string"
    ) {
      return {
        news_headline: parsed.news_headline.trim(),
        news_body: parsed.news_body.trim(),
        tip_headline: parsed.tip_headline.trim(),
        tip_body: parsed.tip_body.trim(),
      };
    }
  } catch {
    return null;
  }

  return null;
}

export async function generateWeeklyIndustryContent(
  industry: string,
): Promise<WeeklyIndustryContent> {
  const apiKey = process.env.ANTHROPIC_API_KEY?.trim();

  if (!apiKey) {
    return FALLBACK_CONTENT;
  }

  try {
    const res = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-api-key": apiKey,
        "anthropic-version": "2023-06-01",
      },
      body: JSON.stringify({
        model: "claude-sonnet-4-20250514",
        max_tokens: 400,
        messages: [
          {
            role: "user",
            content: `Generate a short realistic industry news headline and blurb (2-3 sentences) and a practical tip of the week (2-3 sentences) for a ${industry} business. Return JSON: { news_headline, news_body, tip_headline, tip_body }`,
          },
        ],
      }),
    });

    if (!res.ok) {
      return FALLBACK_CONTENT;
    }

    const data = (await res.json()) as {
      content?: { type: string; text?: string }[];
    };
    const text = data.content?.find((block) => block.type === "text")?.text ?? "";
    const parsed = parseIndustryContent(text);

    return parsed ?? FALLBACK_CONTENT;
  } catch {
    return FALLBACK_CONTENT;
  }
}
