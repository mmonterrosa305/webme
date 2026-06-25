import * as cheerio from "cheerio";
import type { AnyNode } from "domhandler";

import { buildGoogleMapsEmbedUrl } from "@/lib/google-maps/build-embed-url";

const GOOGLE_MAP_STYLES = `<style id="webme-google-map-styles">
.webme-google-map-wrapper {
  width: 100%;
  margin: 1.5rem 0;
  grid-column: 1 / -1;
}
.webme-google-map {
  display: block;
  width: 100%;
  height: 300px;
  border: 0;
  border-radius: 12px;
  overflow: hidden;
}
</style>`;

function findContactSection($: cheerio.CheerioAPI): cheerio.Cheerio<AnyNode> {
  const byId = $("#contact").first();
  if (byId.length) {
    return byId;
  }

  return $("section")
    .filter((_index, element) => {
      return (
        $(element).find('[data-webme="phone"]').length > 0 ||
        $(element).find("form").length > 0
      );
    })
    .first();
}

function findContactInfoBlock(
  $: cheerio.CheerioAPI,
  $contact: cheerio.Cheerio<AnyNode>,
): cheerio.Cheerio<AnyNode> {
  const byClass = $contact.find(".contact-info").first();
  if (byClass.length) {
    return byClass;
  }

  const byAddress = $contact.find('[data-webme="address"]').first().closest("div");
  if (byAddress.length) {
    return byAddress;
  }

  const byPhone = $contact.find('[data-webme="phone"]').first().closest("div");
  if (byPhone.length) {
    return byPhone;
  }

  return $();
}

function findContactForm(
  $contact: cheerio.Cheerio<AnyNode>,
): cheerio.Cheerio<AnyNode> {
  return $contact.find("form").first();
}

function buildMapMarkup(embedUrl: string): string {
  return `${GOOGLE_MAP_STYLES}
<div class="webme-google-map-wrapper" data-webme="google-map">
  <iframe
    class="webme-google-map"
    title="Business location on Google Maps"
    loading="lazy"
    referrerpolicy="no-referrer-when-downgrade"
    allowfullscreen
    src="${embedUrl}"
  ></iframe>
</div>`;
}

export function hasGoogleMapEmbed(html: string): boolean {
  return html.includes('data-webme="google-map"');
}

export function injectGoogleMapIntoContactSection(
  html: string,
  address: string,
): string {
  const embedUrl = buildGoogleMapsEmbedUrl(address);
  if (!embedUrl) {
    return html;
  }

  return injectGoogleMapEmbedUrl(html, embedUrl);
}

export function injectGoogleMapEmbedUrl(
  html: string,
  embedUrl: string,
): string {
  if (!embedUrl.trim() || hasGoogleMapEmbed(html)) {
    return html;
  }

  const $ = cheerio.load(html);
  const $contact = findContactSection($);

  if (!$contact.length) {
    return html;
  }

  $(".webme-google-map-wrapper, [data-webme='google-map']").remove();
  $("#webme-google-map-styles").remove();

  const mapMarkup = buildMapMarkup(embedUrl);
  const $grid = $contact.find(".contact-grid").first();
  const $form = findContactForm($contact);
  const $info = findContactInfoBlock($, $contact);

  if ($grid.length && $info.length && $form.length) {
    $info.after(mapMarkup);
  } else if ($grid.length) {
    $grid.append(mapMarkup);
  } else if ($form.length) {
    $form.before(mapMarkup);
  } else if ($info.length) {
    $info.after(mapMarkup);
  } else {
    const $container = $contact.find(".container").first();
    if ($container.length) {
      $container.append(mapMarkup);
    } else {
      $contact.append(mapMarkup);
    }
  }

  return $.html();
}
