import { readFileSync } from "node:fs";
import { join } from "node:path";

const GSAP_CORE_PATH = join(process.cwd(), "node_modules/gsap/dist/gsap.min.js");
const SCROLL_TRIGGER_PATH = join(
  process.cwd(),
  "node_modules/gsap/dist/ScrollTrigger.min.js",
);

let gsapCoreSource: string | null = null;
let scrollTriggerSource: string | null = null;

export const INLINE_GSAP_CORE_SCRIPT_ID = "webme-gsap-inline-core";
export const INLINE_SCROLL_TRIGGER_SCRIPT_ID = "webme-gsap-inline-scrolltrigger";

function readGsapFile(path: string): string {
  return readFileSync(path, "utf8");
}

export function getInlineGsapCoreSource(): string {
  if (!gsapCoreSource) {
    gsapCoreSource = readGsapFile(GSAP_CORE_PATH);
  }

  return gsapCoreSource;
}

export function getInlineScrollTriggerSource(): string {
  if (!scrollTriggerSource) {
    scrollTriggerSource = readGsapFile(SCROLL_TRIGGER_PATH);
  }

  return scrollTriggerSource;
}
