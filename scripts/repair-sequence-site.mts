import { prepareAndPersistLeadSiteHtml } from "../lib/agents/prepare-lead-site-html";
import { hasStaleSequenceInitScript } from "../lib/agents/scroll-hero-sequence";
import { createAdminClient } from "../lib/supabase/admin";

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

  console.log("Before:", {
    length: data.site_html.length,
    staleInit: hasStaleSequenceInitScript(data.site_html),
  });

  const prepared = await prepareAndPersistLeadSiteHtml(
    slug,
    data.site_html,
    data.site_metadata,
    data.industry,
  );

  console.log("After:", {
    length: prepared.length,
    staleInit: hasStaleSequenceInitScript(prepared),
    lazyLoad: prepared.includes("function loadImageAt"),
  });
}

void main();
