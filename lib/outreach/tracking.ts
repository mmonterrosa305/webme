import { randomUUID } from "node:crypto";

import { getClientPortalAppUrl } from "@/lib/client-auth/app-url";

export const TRANSPARENT_GIF = Buffer.from(
  "R0lGODlhAQABAIAAAAAAAP///yH5BAEAAAAALAAAAAABAAEAAAIBRAA7",
  "base64",
);

export function createOutreachTrackingToken(): string {
  return randomUUID();
}

export function getOutreachTrackingPixelUrl(trackingToken: string): string {
  const baseUrl = getClientPortalAppUrl();
  return `${baseUrl}/api/outreach/open/${trackingToken}`;
}

export function injectOutreachTrackingPixel(
  html: string,
  trackingPixelUrl: string,
): string {
  const pixel = `<img src="${trackingPixelUrl}" width="1" height="1" alt="" style="display:none;width:1px;height:1px;border:0;" />`;

  if (html.includes("</body>")) {
    return html.replace("</body>", `${pixel}</body>`);
  }

  return `${html}${pixel}`;
}
