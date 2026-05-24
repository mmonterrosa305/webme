import Anthropic from "@anthropic-ai/sdk";
import type { MessageParam } from "@anthropic-ai/sdk/resources/messages/messages";

import {
  COLOR_PALETTES,
  DESIGN_STYLES,
  type PaletteId,
  type SectionId,
  type StyleId,
} from "./site-options";

const MODEL = "claude-sonnet-4-20250514";

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
  businessName: string;
  city: string;
  industry: string;
  tagline?: string;
  paletteId: PaletteId;
  styleId: StyleId;
  sections: SectionId[];
  createLogoForMe: boolean;
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

function buildUserPrompt(input: BuildSiteInput): string {
  const palette = getPalette(input.paletteId);
  const style = getStyle(input.styleId);
  const sectionLabels = input.sections
    .map((id) => id.charAt(0).toUpperCase() + id.slice(1))
    .join(", ");

  const taglineBlock = input.tagline?.trim()
    ? `\n- Tagline / description: ${input.tagline.trim()}`
    : "";

  let logoInstructions: string;

  if (input.logoSvg) {
    logoInstructions = `Use the client's uploaded SVG logo in the header. Embed it inline or as a data URI. SVG markup provided separately in this message. Scale it appropriately; ensure it works on light and dark header backgrounds using the palette.`;
  } else if (input.logoBase64 && input.logoMediaType) {
    logoInstructions = `Use the client's uploaded logo image (attached) in the header at a tasteful size. Do not distort aspect ratio.`;
  } else if (input.createLogoForMe) {
    logoInstructions = `Design a simple, professional text-and-icon mark logo in pure CSS/SVG inline (no external assets) that fits the brand and palette. Place it in the header.`;
  } else {
    logoInstructions = `No logo provided—use a refined typographic wordmark of the business name in the header.`;
  }

  return `Build a complete single-file HTML website with these specifications:

## Business
- Name: ${input.businessName}
- City: ${input.city}
- Industry: ${input.industry}${taglineBlock}

## Color palette — "${palette.name}" (${palette.description})
Use these exact hex values as CSS variables and throughout the design:
- Primary: ${palette.primary}
- Secondary: ${palette.secondary}
- Accent: ${palette.accent}

## Design style — "${style.label}"
${style.description}

## Client-selected sections (include all of these; add Gallery, Pricing, FAQ, or Map if selected)
${sectionLabels}

Also honor the system prompt's required sections (Hero, About with stats, Services, Testimonials, Contact). Layer the client's palette and style on top of the cinematic, animated experience.

## Logo
${logoInstructions}

## Quality bar
Award-winning, conversion-focused, visually stunning — never generic. Use --color-primary, --color-secondary, and --color-accent from the palette for gradients, overlays, and CTAs.`;
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
  const businessName = input.businessName.trim();
  const city = input.city.trim();
  const industry = input.industry.trim();

  if (!businessName || !city || !industry) {
    throw new Error("businessName, city, and industry are required.");
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
