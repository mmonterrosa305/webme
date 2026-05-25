import Anthropic from "@anthropic-ai/sdk";
import type { MessageParam } from "@anthropic-ai/sdk/resources/messages/messages";

import type { BusinessProfile } from "./scrapeBusinessData";
import {
  COLOR_PALETTES,
  DESIGN_STYLES,
  type PaletteId,
  type SectionId,
  type StyleId,
} from "./site-options";

const MODEL = "claude-sonnet-4-5";

const SYSTEM_PROMPT = `You are one of the world's best creative web designers and animators. You build websites that win design awards. Every site must feel alive, cinematic, and premium.

REQUIRED in every site:
- Full screen hero with a stunning real Unsplash image (pick the best URL for the industry), large bold typography that fades in on load
- Scroll-triggered animations using Intersection Observer API — elements slide, fade, scale in as user scrolls
- At least one WOW moment — a creative animation specific to the industry (example: for a restaurant, food items fly in; for a plumber, water flows; for a florist, petals fall)
- Parallax depth on the hero image
- Sticky nav that transitions from transparent to solid on scroll
- Premium font pairing from Google Fonts — one serif display + one clean sans-serif
- Rich color depth — gradients, overlays, depth
- Hover micro-interactions on every button and card
- Glassmorphism on at least one section
- Sections: Hero, About with stats, Services with animated cards, Testimonials with large pull quotes, Contact with styled form
- Mobile responsive
- ALL CSS and JS inline in one HTML file
- Use real Unsplash image URLs — search for the best cinematic images for the industry
- Output ONLY raw HTML starting with <!DOCTYPE html>`;

export type BuildSiteInput = {
  city: string;
  industry: string;
  tagline?: string;
  paletteId: PaletteId;
  styleId: StyleId;
  sections: SectionId[];
  createLogoForMe: boolean;
  businessProfile: BusinessProfile;
  logoBase64?: string;
  logoMediaType?: "image/png" | "image/jpeg" | "image/gif" | "image/webp";
  logoSvg?: string;
};

function getAnthropicApiKey(): string {
  const key = process.env.ANTHROPIC_API_KEY?.trim();

  if (!key) {
    throw new Error("Missing ANTHROPIC_API_KEY environment variable.");
  }

  return key;
}

function getPalette(paletteId: PaletteId) {
  const palette = COLOR_PALETTES.find((p) => p.id === paletteId);

  if (!palette) {
    throw new Error(`Invalid palette: ${paletteId}`);
  }

  return palette;
}

function getStyle(styleId: StyleId) {
  const style = DESIGN_STYLES.find((s) => s.id === styleId);

  if (!style) {
    throw new Error(`Invalid style: ${styleId}`);
  }

  return style;
}

function formatList(values: string[], fallback = "Not available"): string {
  return values.length > 0 ? values.join(", ") : fallback;
}

function buildUserPrompt(input: BuildSiteInput): string {
  const palette = getPalette(input.paletteId);
  const style = getStyle(input.styleId);
  const sectionLabels = input.sections
    .map((id) => id.charAt(0).toUpperCase() + id.slice(1))
    .join(", ");
  const profile = input.businessProfile;
  const taglineBlock = input.tagline?.trim()
    ? `\n- User-provided tagline/description: ${input.tagline.trim()}`
    : "";

  let logoInstructions: string;

  if (input.logoSvg) {
    logoInstructions =
      "Use the client's uploaded SVG logo in the header. Embed it inline or as a data URI. SVG markup is provided separately in this message.";
  } else if (input.logoBase64 && input.logoMediaType) {
    logoInstructions =
      "Use the client's uploaded logo image (attached) in the header at a tasteful size. Do not distort the aspect ratio.";
  } else if (input.createLogoForMe) {
    logoInstructions =
      "Design a simple, professional text-and-icon mark logo in pure CSS/SVG inline (no external assets) that fits the brand and palette.";
  } else {
    logoInstructions =
      "No logo provided — use a refined typographic wordmark of the business name in the header.";
  }

  return `Build a complete single-file HTML website with these specifications:

## Project context
- City: ${input.city}
- Industry: ${input.industry}${taglineBlock}

## Real business profile data
- Business name: ${profile.businessName}
- Address: ${profile.address ?? "Not available"}
- Phone: ${profile.phone ?? "Not available"}
- Hours: ${formatList(profile.hours)}
- Rating: ${profile.rating ?? "Not available"}
- Review count: ${profile.reviewCount ?? "Not available"}
- Owner name: ${profile.ownerName ?? "Not available"}
- Owner email: ${profile.ownerEmail ?? "Not available"}
- Services: ${formatList(profile.services)}
- Primary description: ${profile.description ?? "Not available"}
- Instagram bio: ${profile.instagramBio ?? "Not available"}
- Instagram captions: ${formatList(profile.instagramPosts, "None available")}
- Instagram hashtags: ${formatList(profile.instagramHashtags, "None available")}
- Facebook description: ${profile.facebookDescription ?? "Not available"}
- Facebook posts: ${formatList(profile.facebookPosts, "None available")}
- Yelp categories: ${formatList(profile.yelpCategories)}
- Price range: ${profile.priceRange ?? "Not available"}
- Website: ${profile.website ?? "Not available"}
- Photo URLs: ${formatList(profile.photos, "None available")}
- Reviews to adapt into testimonials: ${formatList(profile.topReviews, "None available")}

## Color palette — "${palette.name}" (${palette.description})
Use these exact hex values as CSS variables and throughout the design:
- Primary: ${palette.primary}
- Secondary: ${palette.secondary}
- Accent: ${palette.accent}

## Design style — "${style.label}"
${style.description}

## Sections to include
${sectionLabels}

## Logo
${logoInstructions}

## Content instructions
- Use the real phone number and address if they are available.
- Use the real services list as the basis for the services section.
- Use the owner name naturally in the copy if it is available.
- Turn the real review text into polished testimonial pull quotes while staying faithful to the sentiment.
- Use the Instagram bio and captions as inspiration for the brand voice, taglines, and CTA language.
- If photo URLs are available and public, use them tastefully; otherwise, use the system prompt's Unsplash requirement.
- If some fields are missing, fill the gaps intelligently without mentioning missing data.

## Quality bar
Award-winning, conversion-focused, visually stunning — never generic. Apply the real business data so the site feels specific, credible, and custom-built.`;
}

function extractHtml(raw: string): string {
  const trimmed = raw.trim();
  const fenced = trimmed.match(/^```(?:html)?\s*([\s\S]*?)```$/i);

  if (fenced) {
    return fenced[1].trim();
  }

  const htmlBlock = trimmed.match(/```html\s*([\s\S]*?)```/i);

  if (htmlBlock) {
    return htmlBlock[1].trim();
  }

  return trimmed;
}

function buildMessageContent(
  input: BuildSiteInput,
): MessageParam["content"] {
  const prompt = buildUserPrompt(input);

  if (input.logoBase64 && input.logoMediaType) {
    return [
      {
        type: "image",
        source: {
          type: "base64",
          media_type: input.logoMediaType,
          data: input.logoBase64,
        },
      },
      { type: "text", text: prompt },
    ];
  }

  if (input.logoSvg) {
    return [
      {
        type: "text",
        text: `${prompt}\n\n## Uploaded SVG logo\nEmbed this SVG in the site header:\n\`\`\`svg\n${input.logoSvg}\n\`\`\``,
      },
    ];
  }

  return prompt;
}

export async function buildSite(input: BuildSiteInput): Promise<string> {
  const city = input.city.trim();
  const industry = input.industry.trim();
  const businessName = input.businessProfile.businessName.trim();

  if (!businessName || !city || !industry) {
    throw new Error("businessProfile.businessName, city, and industry are required.");
  }

  if (input.sections.length === 0) {
    throw new Error("At least one section must be selected.");
  }

  const client = new Anthropic({ apiKey: getAnthropicApiKey() });

  const message = await client.messages.create({
    model: MODEL,
    max_tokens: 16384,
    system: SYSTEM_PROMPT,
    messages: [
      {
        role: "user",
        content: buildMessageContent(input),
      },
    ],
  });

  const textBlock = message.content.find((block) => block.type === "text");

  if (!textBlock || textBlock.type !== "text") {
    throw new Error("No text response from Claude.");
  }

  const html = extractHtml(textBlock.text);

  if (!html.includes("<html") && !html.includes("<!DOCTYPE")) {
    throw new Error("Model response did not contain valid HTML.");
  }

  return html;
}
