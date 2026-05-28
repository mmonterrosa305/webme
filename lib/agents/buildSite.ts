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
- Be concise with COPY (short headlines, one-line descriptions) but RICH with DESIGN (cinematic imagery, overlays, spacing, typography, cards, subtle shadows).
- Put ALL CSS in one <style> block at the TOP of <head> BEFORE any <body> content so styles stay intact if output is cut off.
- Minimal JS in one <script> at the end of <body>.
- Structure: <!DOCTYPE html> → <head> (meta, Google Fonts, <style>) → <body> (all sections) → <script> → close tags.
- Output ONLY raw HTML starting with <!DOCTYPE html>.

## Images — fixed industry URL map (required)
Use only the following exact hero background URLs (do not use source.unsplash.com):
- Electrician: https://images.unsplash.com/photo-1621905251189-08b45d6a269e?w=1600&q=80
- Plumbing: https://images.unsplash.com/photo-1585704032915-c3400ca199e7?w=1600&q=80
- HVAC: https://images.unsplash.com/photo-1631545806609-27a0d3f26e2e?w=1600&q=80
- Restaurant: https://images.unsplash.com/photo-1517248135467-4c7edcad34c4?w=1600&q=80
- Hair Salon: https://images.unsplash.com/photo-1560066984-138daaa8e6d9?w=1600&q=80
- Dental: https://images.unsplash.com/photo-1606811841689-23dfddce3e95?w=1600&q=80
- Law: https://images.unsplash.com/photo-1589829545856-d10d557cf95f?w=1600&q=80
- Landscaping: https://images.unsplash.com/photo-1416879595882-3373a0480b5b?w=1600&q=80
- Cleaning: https://images.unsplash.com/photo-1581578731548-c64695cc6952?w=1600&q=80
- Auto Repair: https://images.unsplash.com/photo-1619642751034-765dfdf7c58e?w=1600&q=80
- Barbershop: https://images.unsplash.com/photo-1503951914875-452162b0f3f1?w=1600&q=80
- Gym: https://images.unsplash.com/photo-1534438327276-14e5300c3a48?w=1600&q=80
- Default: https://images.unsplash.com/photo-1497366216548-37526070297c?w=1600&q=80
- Service image URLs (use these exact URLs for service card backgrounds):
  - Electrical panel/wiring: https://images.unsplash.com/photo-1558618666-fcd25c85cd64?w=800&q=80
  - Emergency/repair: https://images.unsplash.com/photo-1504307651254-35680f356dfd?w=800&q=80
  - Installation: https://images.unsplash.com/photo-1581092580497-e0d23cbdf1dc?w=800&q=80
  - Commercial: https://images.unsplash.com/photo-1565814329452-e1efa11c5b89?w=800&q=80
- About section image URL (use this exact URL on the right column): https://images.unsplash.com/photo-1566195992011-5f6b21e539aa?w=800&q=80
- Gallery row image URLs (place 3 side-by-side cards above Contact):
  - https://images.unsplash.com/photo-1558618666-fcd25c85cd64?w=800&q=80
  - https://images.unsplash.com/photo-1504307651254-35680f356dfd?w=800&q=80
  - https://images.unsplash.com/photo-1581092580497-e0d23cbdf1dc?w=800&q=80
- Match the business industry to the closest URL above; if no close match exists, use Default.
- Hero: full-screen cinematic background-image with the mapped URL (min-height 100vh, background-size: cover, background-position: center).
- Hero overlay: pseudo-element or overlay div with background rgba(0,0,0,0.5) for text readability.
- Hero typography: large bold white headline + subheadline + prominent CTA on top of the overlay.
- Services section: each service card must use one of the service image URLs above as a background image.
- Service card layout: min-height 250px, cover background image, dark overlay, white text content on top.
- About section layout: strict 2-column layout with text/stats on left and large image on right using the exact About URL above.
- Add a before/after or gallery row with 3 images side by side directly above the Contact section.
- Do NOT use source.unsplash.com, scraped business photo URLs, Pexels, or random image URLs.

## Sections (include ONLY these eight — in this order)
1. Hero — full-screen (100vh), mapped fixed industry image URL from the list above, dark rgba(0,0,0,0.5) overlay, large white headline, subheadline, primary CTA. Fade-in on load.
2. Trust bar — horizontal row of 4 stat badges (e.g. years in business, star rating, jobs completed, availability/24-7). Use real rating/review data when provided; plausible industry defaults otherwise.
3. Services — 4–6 cards in a responsive grid. Each card must use one of the exact service image URLs as the card background, with min-height 250px, dark overlay, white title + short description text.
4. About — 2-column layout: left = short brand story (2–3 sentences) + stats; right = large image using the exact About image URL.
5. Testimonials — 3 review cards with star rating (★), quote (1–2 sentences), customer name. Adapt from real reviews when provided.
6. Gallery row — 3 side-by-side images (before/after style) using the exact Gallery URLs listed above.
7. Contact — 2-column: left = form (Name, Email, Phone, Message + hidden ownerEmail); right = business info sidebar (phone, address, hours). Submit via fetch("/api/contact") POST JSON { name, email, phone, message, ownerEmail }; inline success/error, no reload.
8. Footer — logo/wordmark, links or contact line, copyright © 2025.

## Animations
- Fade-in on load for hero and main sections only. No scroll animations, no Intersection Observer, no complex effects.

## Design
- Premium Google Fonts pairing (display + body). Mobile responsive. Cinematic photo hero; alternating section backgrounds (subtle gradients or solid fills) below the hero.
- Reuse CSS classes (.btn, .card, .section, .grid, .hero-overlay) to save lines while keeping a polished, high-end look.`;

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
- Photo URLs (do not use directly): ${formatList(profile.photos, "None available")}
- Reviews for testimonials: ${formatList(profile.topReviews, "write 3 plausible reviews for the industry")}

## Color palette — "${palette.name}" (${palette.description})
Use these as the starting palette. If the brand reference images clearly indicate an existing visual identity, adapt the palette to mirror that identity while staying harmonized with these values:
- Primary: ${palette.primary}
- Secondary: ${palette.secondary}
- Accent: ${palette.accent}

## Design style — "${style.label}"
${style.description}

## Sections to include (exactly eight, in order — no extra sections)
1. Hero — full screen, choose the mapped fixed image URL for industry "${input.industry}" from the system prompt list, rgba(0,0,0,0.5) overlay, large white headline, subheadline, CTA
2. Trust bar — 4 stats (rating: ${profile.rating ?? "use 4.9"}, reviews: ${profile.reviewCount ?? "use plausible count"})
3. Services — 4–6 cards from: ${formatList(profile.services, "invent 5 typical services")} with backgrounds from the fixed service image URL list in the system prompt
4. About — 2 columns: text/stats on left and large image on right using the fixed About image URL from the system prompt
5. Testimonials — 3 reviews with stars (use review text above when available)
6. Gallery row — 3 side-by-side before/after style images using the fixed gallery URLs from the system prompt
7. Contact — form + sidebar with phone/address/hours
8. Footer — © 2025

## Brand reference images (inspiration only)
- Brand/artwork URLs (colors and style inspiration only — do not embed unless they match approved system prompt rules): ${formatList(profile.brandImageUrls, "None available")}

## Logo
${logoInstructions}

## Visual design (mandatory)
- Max 500 lines. ALL CSS in <head> before <body>. Concise copy, rich cinematic design.
- Hero: use the exact mapped industry URL from the system prompt list + overlay rgba(0,0,0,0.5) + large white text.
- Service cards: min-height 250px, background image from fixed service URLs, dark overlay, white text.
- About right column: large image from fixed About URL.
- Gallery row: 3 equal-width images above Contact.
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
