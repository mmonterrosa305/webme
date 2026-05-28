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
const REMOTE_BRAND_REFERENCE_LIMIT = 3;

const SYSTEM_PROMPT = `You build polished single-page business websites. Keep output SHORT and COMPLETE — the entire file must fit in one response.

## Length and file structure (critical)
- The full HTML file must be NO MORE than 500 lines total. Be concise: minimal CSS, no redundant rules, no comments.
- Put ALL CSS in a single <style> block at the TOP of <head> BEFORE any <body> content. If output is truncated, styles must already be complete.
- Then write <body> HTML only. Put minimal JS in one <script> at the end of <body>.
- Structure: <!DOCTYPE html> → <html> → <head> (meta, Google Fonts link, <style>...</style>) → <body> (sections) → <script>...</script> → close tags.
- Output ONLY raw HTML starting with <!DOCTYPE html>. No markdown fences.

## NO external images
- NO <img src="https://...">, NO background-image: url(https://...). Google Fonts only as external resource.
- Inline uploaded logos (base64/SVG from prompt) allowed in header only.
- Visuals: CSS gradients, solid colors, typography, simple inline SVG icons.

## Sections (include ONLY these four — nothing else)
1. Hero — full-width, rich dark CSS gradient background, business name, short tagline, one CTA button. Fade-in on load only (simple @keyframes opacity).
2. Services — exactly 3 cards using real service names from the brief; each card: title + one short sentence.
3. Contact — form with Name, Email, Phone, Message; hidden ownerEmail field; submit via fetch("/api/contact") POST JSON { name, email, phone, message, ownerEmail }; show success/error inline without reload.
4. Footer — phone, address if available, copyright © 2025.

## Animations
- ONLY simple fade-in on page load for hero text (and optionally cards). No scroll animations, no Intersection Observer, no complex WOW effects.

## Design
- One Google Fonts pairing (display + body). Mobile responsive. Clean, professional, not over-designed.
- Hero: dark multi-stop linear-gradient + optional subtle radial glow — CSS only.`;

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

function buildUserPrompt(input: BuildSiteInput): string {
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
- Photo URLs (for context only — do NOT use in HTML): ${formatList(profile.photos, "None available")}
## Color palette — "${palette.name}" (${palette.description})
Use these as the starting palette. If the brand reference images clearly indicate an existing visual identity, adapt the palette to mirror that identity while staying harmonized with these values:
- Primary: ${palette.primary}
- Secondary: ${palette.secondary}
- Accent: ${palette.accent}

## Design style — "${style.label}"
${style.description}

## Sections to include (exactly four — do not add About, Testimonials, or other sections)
1. Hero — gradient background, business name, tagline, CTA
2. Services — exactly 3 cards from the services list below
3. Contact — form with fetch to /api/contact
4. Footer — contact details and © 2025

## Brand reference images (inspiration only)
- Brand/artwork URLs (analyze colors and style only — never embed as <img> or background-image): ${formatList(profile.brandImageUrls, "None available")}

## Logo
${logoInstructions}

## Visual design (mandatory)
- Max 500 lines total. ALL CSS in one <style> block in <head> before <body>.
- Hero: dark CSS gradient only — no external images.
- Exactly 3 service cards — pick the top 3 from the services list (or invent 3 plausible ones for the industry).
- Fade-in on load only; no scroll-triggered or complex animations.

## Content instructions
- Use real phone and address in footer/contact when available.
- Pick 3 services from: ${formatList(profile.services, "use 3 typical services for the industry")}
- Use Instagram bio for tagline inspiration if available.
- Hidden ownerEmail value: ${profile.ownerEmail ?? ""}
- Keep copy short. Do not add extra sections.`;
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
): Promise<MessageParam["content"]> {
  const prompt = buildUserPrompt(input);
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
    max_tokens: 8192,
    system: SYSTEM_PROMPT,
    messages: [
      {
        role: "user",
        content: await buildMessageContent(input),
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

  return html;
}
