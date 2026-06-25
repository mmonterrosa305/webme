import { buildGoogleMapsEmbedUrl } from "@/lib/google-maps/build-embed-url";
import {
  hasGoogleMapEmbed,
  injectGoogleMapEmbedUrl,
  injectGoogleMapIntoContactSection,
} from "@/lib/site-editor/inject-google-map";
import type { SiteMetadata } from "@/lib/site-editor/types";

export function enrichBuiltSiteWithGoogleMap(options: {
  html: string;
  metadata: SiteMetadata;
  address?: string | null;
}): { html: string; metadata: SiteMetadata } {
  const address =
    options.address?.trim() ||
    options.metadata.businessAddress?.trim() ||
    "";

  const embedUrl = buildGoogleMapsEmbedUrl(address);
  if (!embedUrl) {
    return { html: options.html, metadata: options.metadata };
  }

  return {
    html: injectGoogleMapIntoContactSection(options.html, address),
    metadata: {
      ...options.metadata,
      businessAddress: address,
      googleMapsEmbedUrl: embedUrl,
    },
  };
}

export function applyStoredGoogleMapToHtml(
  html: string,
  metadata?: SiteMetadata | null,
): string {
  const embedUrl = metadata?.googleMapsEmbedUrl?.trim();
  if (!embedUrl || hasGoogleMapEmbed(html)) {
    return html;
  }

  return injectGoogleMapEmbedUrl(html, embedUrl);
}
