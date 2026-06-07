import Anthropic from "@anthropic-ai/sdk";
import type { MessageParam } from "@anthropic-ai/sdk/resources/messages/messages";
import slugify from "slugify";

import type { BusinessProfile } from "./scrapeBusinessData";
import { fetchPexelsVideo } from "./fetch-pexels-video";
import {
  buildIndustryHeroListForPrompt,
  formatIndustryImagePromptBlock,
  getRandomHero,
} from "./industry-images";
import {
  COLOR_PALETTES,
  DESIGN_STYLES,
  type PaletteId,
  type SectionId,
  type StyleId,
} from "./site-options";

const MODEL = "claude-sonnet-4-5";
const REMOTE_BRAND_REFERENCE_LIMIT = 3;

const SYSTEM_PROMPT = `You build polished single-page business websites. The file must be COMPLETE in one response — stay under the line budget.

## Length and file structure (critical)
- Maximum 500 lines total. Make every line count: shared utility classes, no duplicate rules, no HTML comments, no markdown fences.
- Be concise with COPY (short headlines, one-line descriptions) but RICH with DESIGN (cinematic imagery, overlays, spacing, typography, cards, subtle shadows).
- Put ALL CSS in one <style> block at the TOP of <head> BEFORE any <body> content so styles stay intact if output is cut off.
- Minimal JS in one <script> at the end of <body>.
- Structure: <!DOCTYPE html> → <head> (meta, Google Fonts, <style>) → <body> (all sections) → <script> → close tags.
- Output ONLY raw HTML starting with <!DOCTYPE html>.

## Images — fixed industry URL map (required)
CRITICAL: Every image must show work being done, tools, or the final result of the service. NEVER use images of plants, furniture, or unrelated objects. If unsure, use the hero image again.
Use only images.unsplash.com URLs from the Resolved industry images block in the user prompt (do not use source.unsplash.com).
Each site has 9 labeled image slots — use the exact URL for each slot. The Hero URL is randomly selected per build from the industry's hero options below.
- Hero → full-screen background video when a Hero video URL is provided in the user prompt; otherwise full-screen background image using the Hero URL
- About → About section right column only
- Service1, Service2, Service3, Service4 → service cards 1–4 backgrounds only
- Gallery1, Gallery2, Gallery3 → gallery row left, center, right only
Use each labeled URL in its designated section only. The user prompt lists all 9 URLs.
Hero reference list (for category matching only — use exact URLs from user prompt):
${buildIndustryHeroListForPrompt()}
- Hero (video): when user prompt includes Hero video URL — min-height 100vh section with absolutely positioned <video> (autoplay loop muted playsinline, no controls, object-fit:cover, width/height 100%), poster set to Hero URL, dark overlay rgba(0,0,0,0.5), white headline content above video.
- Hero (image fallback): when no Hero video URL — full-screen cinematic background-image (min-height 100vh, background-size: cover, background-position: center).
- Hero overlay: rgba(0,0,0,0.5) for text readability.
- Hero text spacing (required): the hero headline/content wrapper must have generous top padding — at least padding-top: 120px (or equivalent, e.g. pt-30) — so the headline never sits too close to the top edge or nav.
- Service cards: min-height 250px, cover background, dark overlay, white text — each card uses its own ServiceN URL.
- About: 2-column layout, large image on right using About URL only.
- Gallery row: 3 side-by-side images using Gallery1, Gallery2, Gallery3 only.
- Do NOT use scraped business photo URLs, Pexels, or random image URLs.

## Sections (include ONLY these eight — in this order)
1. Hero — full-screen (100vh). If user prompt includes Hero video URL: use that MP4 as background video (autoplay, loop, muted, playsinline, no controls, object-fit cover) with Hero URL as poster/fallback. Otherwise use Hero URL as background-image. Dark rgba(0,0,0,0.5) overlay, large white headline, subheadline, primary CTA. Hero text wrapper: padding-top at least 120px. Fade-in on load.
2. Trust bar — horizontal row of 4 stat badges (e.g. years in business, star rating, jobs completed, availability/24-7). Use real rating/review data when provided; plausible industry defaults otherwise.
3. Services — 4 service cards in a responsive grid. Card backgrounds: Service1, Service2, Service3, Service4 (each a different photo). Min-height 250px, dark overlay, white title + short description.
4. About — 2-column layout: left = short brand story (2–3 sentences) + stats; right = large image using About URL only.
5. Testimonials — 3 review cards with star rating (★), quote (1–2 sentences), customer name. Adapt from real reviews when provided.
6. Gallery row — 3 side-by-side images using Gallery1, Gallery2, Gallery3 from Resolved industry images.
7. Contact — 2-column: left = form (Name, Email, Phone, Message + hidden ownerEmail); right = business info sidebar (phone, address, hours). Submit via fetch("/api/contact") POST JSON { name, email, phone, message, ownerEmail, siteSlug: "SITE_SLUG_PLACEHOLDER", businessName: "BUSINESS_NAME_PLACEHOLDER" }; inline success/error, no reload.
8. Footer — logo/wordmark, links or contact line, copyright © 2025.

## Client-editable markers (required)
Add these exact data-webme attributes so clients can edit their site later:
- Hero section wrapper: data-webme="hero-image" on the <video> element (video hero) or on the element with the hero background-image (image hero)
- Hero h1: data-webme="headline"
- Hero subheadline (first p under h1): data-webme="tagline"
- Header/nav logo img: data-webme="logo"
- About section image: data-webme="about-image"
- Service card backgrounds (in order): data-webme="service-image-1" through data-webme="service-image-4"
- Gallery images (left to right): data-webme="gallery-image-1" through data-webme="gallery-image-3"
- Contact sidebar phone: data-webme="phone" (also use tel: link)
- Contact sidebar address: data-webme="address"
- Contact sidebar hours list wrapper: data-webme="hours-block" with each hour as an li
- Business name in footer: data-webme="business-name"

## Animations
- Fade-in on load for hero and main sections only. No scroll animations, no Intersection Observer, no complex effects.

## Design
- Premium Google Fonts pairing (display + body). Mobile responsive. Cinematic photo hero; alternating section backgrounds (subtle gradients or solid fills) below the hero.
- Hero content must always sit well below the top — minimum padding-top: 120px on the hero text container.
- Reuse CSS classes (.btn, .card, .section, .grid, .hero-overlay, .hero-content) to save lines while keeping a polished, high-end look.`;

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

type SupportedImageMediaType =
  | "image/png"
  | "image/jpeg"
  | "image/gif"
  | "image/webp";

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

async function fetchReferenceImageBlocks(
  imageUrls: string[],
): Promise<
  Array<{
    type: "image";
    source: {
      type: "base64";
      media_type: SupportedImageMediaType;
      data: string;
    };
  }>
> {
  const supportedMediaTypes = new Set<SupportedImageMediaType>([
    "image/png",
    "image/jpeg",
    "image/gif",
    "image/webp",
  ]);

  const results = await Promise.allSettled(
    imageUrls.slice(0, REMOTE_BRAND_REFERENCE_LIMIT).map(async (url) => {
      const response = await fetch(url);

      if (!response.ok) {
        throw new Error(`Failed to fetch image: ${response.status}`);
      }

      const mediaType = response.headers.get("content-type")?.split(";")[0];

      if (!mediaType || !supportedMediaTypes.has(mediaType as SupportedImageMediaType)) {
        throw new Error("Unsupported image media type.");
      }

      const arrayBuffer = await response.arrayBuffer();
      const data = Buffer.from(arrayBuffer).toString("base64");

      return {
        type: "image" as const,
        source: {
          type: "base64" as const,
          media_type: mediaType as SupportedImageMediaType,
          data,
        },
      };
    }),
  );

  return results
    .filter(
      (
        result,
      ): result is PromiseFulfilledResult<{
        type: "image";
        source: {
          type: "base64";
          media_type: SupportedImageMediaType;
          data: string;
        };
      }> => result.status === "fulfilled",
    )
    .map((result) => result.value);
}

function buildUserPrompt(
  input: BuildSiteInput,
  options: { heroUrl: string; heroVideoUrl: string | null; siteSlug: string },
): string {
  const { heroUrl, heroVideoUrl, siteSlug } = options;
  const palette = getPalette(input.paletteId);
  const style = getStyle(input.styleId);
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
- Photo URLs (do not use directly): ${formatList(profile.photos, "None available")}
- Reviews for testimonials: ${formatList(profile.topReviews, "write 3 plausible reviews for the industry")}

## Color palette — "${palette.name}" (${palette.description})
Use these as the starting palette. If the brand reference images clearly indicate an existing visual identity, adapt the palette to mirror that identity while staying harmonized with these values:
- Primary: ${palette.primary}
- Secondary: ${palette.secondary}
- Accent: ${palette.accent}

## Design style — "${style.label}"
${style.description}

${formatIndustryImagePromptBlock(input.industry, heroUrl)}

${
  heroVideoUrl
    ? `## Hero background video (required)
Use this exact MP4 as the full-screen hero background (not a static image):
- Hero video URL: ${heroVideoUrl}
- Hero poster / fallback image: ${heroUrl} (set as video poster attribute)
- Place data-webme="hero-image" on the <video> element
- Video attributes: autoplay loop muted playsinline, no controls
- Style video: position absolute, inset 0, width 100%, height 100%, object-fit cover, z-index 0
- Section: position relative, min-height 100vh, overflow hidden
- Overlay div above video: rgba(0,0,0,0.5)
- Hero text content above overlay (z-index 2), white typography, padding-top at least 120px on the text wrapper
- Do NOT use background-image for the hero when this video URL is provided`
    : `## Hero background
No hero video available — use the Hero URL above as a full-screen background-image. Hero text wrapper: padding-top at least 120px.`
}

## Sections to include (exactly eight, in order — no extra sections)
1. Hero — full screen, ${heroVideoUrl ? "Hero video URL with poster fallback" : "exact Hero URL"}, rgba(0,0,0,0.5) overlay, large white headline, subheadline, CTA, hero text padding-top at least 120px
2. Trust bar — 4 stats (rating: ${profile.rating ?? "use 4.9"}, reviews: ${profile.reviewCount ?? "use plausible count"})
3. Services — 4 cards from: ${formatList(profile.services, "invent 4 typical services")} — backgrounds: Service1, Service2, Service3, Service4 (one URL per card)
4. About — 2 columns: text/stats on left; right = exact About URL
5. Testimonials — 3 reviews with stars (use review text above when available)
6. Gallery row — Gallery1, Gallery2, Gallery3 (left to right, all different photos)
7. Contact — form + sidebar with phone/address/hours; include siteSlug: "${siteSlug}", businessName: "${profile.businessName}" in the contact fetch JSON
8. Footer — © 2025

## Brand reference images (inspiration only)
- Brand/artwork URLs (colors and style inspiration only — do not embed unless they match approved system prompt rules): ${formatList(profile.brandImageUrls, "None available")}

## Logo
${logoInstructions}

## Visual design (mandatory)
- Max 500 lines. ALL CSS in <head> before <body>. Concise copy, rich cinematic design.
- CRITICAL: Every image must show work being done, tools, or the final result of the service. NEVER use plants, furniture, or unrelated objects. If unsure, use the Hero URL.
- Use ONLY the 9 labeled URLs from Resolved industry images in their designated sections.
- Hero text container: padding-top at least 120px so headline never hugs the top.
- Fade-in on load only.

## Content instructions
- Use real phone, address, hours in contact sidebar and footer.
- Hidden ownerEmail: ${profile.ownerEmail ?? ""}
- Short copy everywhere; let layout, color, and typography carry the premium feel.`;
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

async function buildMessageContent(
  input: BuildSiteInput,
  options: { heroUrl: string; heroVideoUrl: string | null; siteSlug: string },
): Promise<MessageParam["content"]> {
  const prompt = buildUserPrompt(input, options);
  const brandReferenceBlocks = await fetchReferenceImageBlocks(
    input.businessProfile.brandImageUrls,
  );

  const content: Array<
    | {
        type: "image";
        source: {
          type: "base64";
          media_type: SupportedImageMediaType;
          data: string;
        };
      }
    | { type: "text"; text: string }
  > = [...brandReferenceBlocks];

  if (input.logoBase64 && input.logoMediaType) {
    content.push({
      type: "image",
      source: {
        type: "base64",
        media_type: input.logoMediaType,
        data: input.logoBase64,
      },
    });
    content.push({ type: "text", text: prompt });
    return content;
  }

  if (input.logoSvg) {
    content.push({
      type: "text",
      text: `${prompt}\n\n## Uploaded SVG logo\nEmbed this SVG in the site header:\n\`\`\`svg\n${input.logoSvg}\n\`\`\``,
    });
    return content;
  }

  if (content.length > 0) {
    content.push({ type: "text", text: prompt });
    return content;
  }

  return prompt;
}

export async function buildSite(
  input: BuildSiteInput,
): Promise<{ html: string; siteSlug: string }> {
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

  const heroUrl = getRandomHero(input.industry);
  const heroVideoUrl = await fetchPexelsVideo(industry);
  const siteSlug = `${slugify(businessName, { lower: true, strict: true })}-${Date.now()}`;
  const messageOptions = { heroUrl, heroVideoUrl, siteSlug };

  const message = await client.messages.create({
    model: MODEL,
    max_tokens: 8192,
    system: SYSTEM_PROMPT,
    messages: [
      {
        role: "user",
        content: await buildMessageContent(input, messageOptions),
      },
    ],
  });

  if (message.stop_reason === "max_tokens") {
    throw new Error(
      "Site generation hit the token limit. Try again or simplify the request.",
    );
  }

  const textBlock = message.content.find((block) => block.type === "text");

  if (!textBlock || textBlock.type !== "text") {
    throw new Error("No text response from Claude.");
  }

  const html = extractHtml(textBlock.text);

  if (!html.includes("<html") && !html.includes("<!DOCTYPE")) {
    throw new Error("Model response did not contain valid HTML.");
  }

  return { html, siteSlug };
}

export async function buildTwoSites(
  input: BuildSiteInput,
): Promise<{ htmlA: string; htmlB: string; slugA: string; slugB: string }> {
  const styleIndex = DESIGN_STYLES.findIndex((style) => style.id === input.styleId);
  const paletteIndex = COLOR_PALETTES.findIndex(
    (palette) => palette.id === input.paletteId,
  );
  const nextStyleId = DESIGN_STYLES[(styleIndex + 1) % DESIGN_STYLES.length].id;
  const nextPaletteId =
    COLOR_PALETTES[(paletteIndex + 1) % COLOR_PALETTES.length].id;

  const inputB: BuildSiteInput = {
    ...input,
    styleId: nextStyleId,
    paletteId: nextPaletteId,
  };

  const [{ html: htmlA, siteSlug: slugA }, { html: htmlB, siteSlug: slugB }] =
    await Promise.all([buildSite(input), buildSite(inputB)]);

  return { htmlA, htmlB, slugA, slugB };
}
