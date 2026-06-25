import { createAdminClient } from "../lib/supabase/admin";
import { getScrollHeroSequenceIdFromMetadata } from "../lib/agents/prepare-lead-site-html";
import { hasStaleSequenceInitScript } from "../lib/agents/scroll-hero-sequence";
import { stripSequenceHeroFromSiteHtml } from "../lib/scroll-hero/strip-sequence-hero-html";

async function main() {
  const slug = process.argv[2] ?? "sal-and-sons-pools-inc-1782348948846";
  const supabase = createAdminClient();
  const { data, error } = await supabase
    .from("leads")
    .select("site_html, site_metadata, industry")
    .eq("site_slug", slug)
    .maybeSingle();

  if (error) {
    throw new Error(error.message);
  }

  if (!data?.site_html) {
    console.error(`No site_html for ${slug}`);
    process.exit(1);
  }

  const sequenceId = getScrollHeroSequenceIdFromMetadata(data.site_metadata);
  if (!sequenceId) {
    console.error(`No scrollHeroSequenceId in metadata for ${slug}`);
    process.exit(1);
  }

  console.log("Before:", {
    length: data.site_html.length,
    staleInit: hasStaleSequenceInitScript(data.site_html),
    sequenceId,
  });

  const stripped = stripSequenceHeroFromSiteHtml(data.site_html);

  const { error: updateError } = await supabase
    .from("leads")
    .update({
      site_html: stripped.html,
      site_metadata: {
        ...((data.site_metadata as Record<string, unknown> | null) ?? {}),
        scrollHeroSequenceId: sequenceId,
      },
    })
    .eq("site_slug", slug);

  if (updateError) {
    throw new Error(updateError.message);
  }

  console.log("After:", {
    length: stripped.html.length,
    staleInit: hasStaleSequenceInitScript(stripped.html),
    hasSequenceInit: stripped.html.includes("webme-scroll-hero-sequence-init"),
    lazyLoadInHtml: stripped.html.includes("function loadImageAt"),
    sequenceId,
  });
}

void main();
