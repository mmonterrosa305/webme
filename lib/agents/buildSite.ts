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

const SYSTEM_PROMPT = `You build polished single-page business websites. The file must be COMPLETE in one response — stay under the line budget.

## Length and file structure (critical)
- Maximum 500 lines total. Make every line count: shared utility classes, no duplicate rules, no HTML comments, no markdown fences.
- Be concise with COPY (short headlines, one-line descriptions) but RICH with DESIGN (gradients, spacing, typography, cards, subtle shadows, inline SVG icons).
- Put ALL CSS in one <style> block at the TOP of <head> BEFORE any <body> content so styles stay intact if output is cut off.
- Minimal JS in one <script> at the end of <body>.
- Structure: <!DOCTYPE html> → <head> (meta, Google Fonts, <style>) → <body> (all sections) → <script> → close tags.
- Output ONLY raw HTML starting with <!DOCTYPE html>.

## NO external images
- NO <img src="https://...">, NO background-image: url(https://...). Google Fonts only as external resource.
- Inline uploaded logos (base64/SVG from prompt) allowed in header only.
- All visuals: CSS gradients, solid colors, typography, inline SVG icons, borders, shadows.

## Sections (include ONLY these seven — in this order)
1. Hero — min-height 100vh (or near), rich dark multi-stop CSS gradient, headline, subheadline, primary CTA button. Simple fade-in on load.
2. Trust bar — horizontal row of 4 stat badges (e.g. years in business, star rating, jobs completed, availability/24-7). Use real rating/review data when provided; plausible industry defaults otherwise.
3. Services — 4–6 cards in a responsive grid. Each card: small inline SVG icon, title, one short description line. Use real services from the brief.
4. About — 2-column layout: left = short brand story (2–3 sentences); right = 3–4 key stats or bullet highlights.
5. Testimonials — 3 review cards with star rating (★), quote (1–2 sentences), customer name. Adapt from real reviews when provided.
6. Contact — 2-column: left = form (Name, Email, Phone, Message + hidden ownerEmail); right = business info sidebar (phone, address, hours). Submit via fetch("/api/contact") POST JSON { name, email, phone, message, ownerEmail }; inline success/error, no reload.
7. Footer — logo/wordmark, links or contact line, copyright © 2025.

## Animations
- Fade-in on load for hero and main sections only. No scroll animations, no Intersection Observer, no complex effects.

## Design
- Premium Google Fonts pairing (display + body). Mobile responsive. Gradient hero + lighter gradient bands on alternating sections.
- Reuse CSS classes (.btn, .card, .section, .grid) to save lines while keeping a polished, high-end look.`;

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
- Reviews for testimonials: ${formatList(profile.topReviews, "write 3 plausible reviews for the industry")}

## Color palette — "${palette.name}" (${palette.description})
Use these as the starting palette. If the brand reference images clearly indicate an existing visual identity, adapt the palette to mirror that identity while staying harmonized with these values:
- Primary: ${palette.primary}
- Secondary: ${palette.secondary}
- Accent: ${palette.accent}

## Design style — "${style.label}"
${style.description}

## Sections to include (exactly seven, in order — no extra sections)
1. Hero — full screen, gradient, headline, subheadline, CTA
2. Trust bar — 4 stats (rating: ${profile.rating ?? "use 4.9"}, reviews: ${profile.reviewCount ?? "use plausible count"})
3. Services — 4–6 cards from: ${formatList(profile.services, "invent 5 typical services")}
4. About — 2 columns, short story + stats
5. Testimonials — 3 reviews with stars (use review text above when available)
6. Contact — form + sidebar with phone/address/hours
7. Footer — © 2025

## Brand reference images (inspiration only)
- Brand/artwork URLs (analyze colors and style only — never embed as <img> or background-image): ${formatList(profile.brandImageUrls, "None available")}

## Logo
${logoInstructions}

## Visual design (mandatory)
- Max 500 lines. ALL CSS in <head> before <body>. Concise copy, rich design (gradients, cards, SVG icons).
- No external images. CSS gradients only.
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
