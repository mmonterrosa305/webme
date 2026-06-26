import fs from "node:fs";
import path from "node:path";

export const INLINE_GSAP_CORE_SCRIPT_ID = "webme-gsap-inline-core";
export const INLINE_SCROLL_TRIGGER_SCRIPT_ID = "webme-gsap-inline-scrolltrigger";

let gsapCoreSource: string | null = null;
let scrollTriggerSource: string | null = null;

function readGsapDistFile(filename: string): string {
  return fs.readFileSync(
    path.join(process.cwd(), "node_modules/gsap/dist", filename),
    "utf8",
  );
}

export function getInlineGsapCoreSource(): string {
  if (!gsapCoreSource) {
    gsapCoreSource = readGsapDistFile("gsap.min.js");
  }

  return gsapCoreSource;
}

export function getInlineScrollTriggerSource(): string {
  if (!scrollTriggerSource) {
    scrollTriggerSource = readGsapDistFile("ScrollTrigger.min.js");
  }

  return scrollTriggerSource;
}
