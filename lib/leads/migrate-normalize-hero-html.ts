import { normalizeHeroSection, isInvalidHeroTagline } from "@/lib/site-editor/normalize-hero-section";
import type { SiteMetadata } from "@/lib/site-editor/types";
import { createAdminClient } from "@/lib/supabase/admin";

type LeadRow = {
  id: string;
  site_slug: string;
  site_html: string;
  site_metadata: SiteMetadata | null;
};

export type HeroHtmlMigrationResult = {
  scanned: number;
  updated: number;
  skipped: number;
  errors: string[];
};

function cleanSiteMetadata(
  metadata: SiteMetadata | null,
): { metadata: SiteMetadata | null; changed: boolean } {
  if (!metadata) {
    return { metadata, changed: false };
  }

  const next: SiteMetadata = { ...metadata };
  let changed = false;

  if (next.headline && isInvalidHeroTagline(next.headline)) {
    delete next.headline;
    changed = true;
  }

  if (next.tagline && isInvalidHeroTagline(next.tagline)) {
    delete next.tagline;
    changed = true;
  }

  return {
    metadata: changed ? next : metadata,
    changed,
  };
}

export function normalizeStoredLeadSiteHtml(
  html: string,
  metadata?: SiteMetadata | null,
): { html: string; metadata: SiteMetadata | null; changed: boolean } {
  const normalizedHtml = normalizeHeroSection(html);
  const { metadata: cleanedMetadata, changed: metadataChanged } =
    cleanSiteMetadata(metadata ?? null);

  const htmlChanged = normalizedHtml !== html;

  return {
    html: normalizedHtml,
    metadata: cleanedMetadata,
    changed: htmlChanged || metadataChanged,
  };
}

/** One-time migration: normalize hero HTML for every stored lead site. */
export async function migrateAllLeadHeroHtml(): Promise<HeroHtmlMigrationResult> {
  const supabase = createAdminClient();
  const result: HeroHtmlMigrationResult = {
    scanned: 0,
    updated: 0,
    skipped: 0,
    errors: [],
  };

  const pageSize = 50;
  let offset = 0;

  while (true) {
    const { data, error } = await supabase
      .from("leads")
      .select("id, site_slug, site_html, site_metadata")
      .not("site_html", "is", null)
      .order("site_built_at", { ascending: true })
      .range(offset, offset + pageSize - 1);

    if (error) {
      throw new Error(error.message);
    }

    const rows = (data ?? []) as LeadRow[];
    if (!rows.length) {
      break;
    }

    for (const lead of rows) {
      result.scanned += 1;

      const html = lead.site_html?.trim() ?? "";
      if (!html) {
        result.skipped += 1;
        continue;
      }

      try {
        const normalized = normalizeStoredLeadSiteHtml(html, lead.site_metadata);

        if (!normalized.changed) {
          result.skipped += 1;
          continue;
        }

        const { error: updateError } = await supabase
          .from("leads")
          .update({
            site_html: normalized.html,
            site_metadata: normalized.metadata,
          })
          .eq("id", lead.id);

        if (updateError) {
          result.errors.push(`${lead.site_slug}: ${updateError.message}`);
          continue;
        }

        result.updated += 1;
        console.log("[migrate-normalize-hero-html] updated", {
          siteSlug: lead.site_slug,
          htmlLengthBefore: html.length,
          htmlLengthAfter: normalized.html.length,
        });
      } catch (err) {
        const message = err instanceof Error ? err.message : String(err);
        result.errors.push(`${lead.site_slug}: ${message}`);
      }
    }

    if (rows.length < pageSize) {
      break;
    }

    offset += pageSize;
  }

  return result;
}

let migrationPromise: Promise<HeroHtmlMigrationResult> | null = null;

/** Run the hero HTML migration once per server process (deploy startup). */
export function runHeroHtmlMigrationOnStartup(): Promise<HeroHtmlMigrationResult> | null {
  if (process.env.NEXT_RUNTIME !== "nodejs") {
    return null;
  }

  if (process.env.SKIP_HERO_HTML_MIGRATION === "1") {
    return null;
  }

  if (!migrationPromise) {
    migrationPromise = migrateAllLeadHeroHtml()
      .then((result) => {
        console.log("[migrate-normalize-hero-html] startup migration complete", result);
        return result;
      })
      .catch((error) => {
        migrationPromise = null;
        console.error(
          "[migrate-normalize-hero-html] startup migration failed:",
          error instanceof Error ? error.message : error,
        );
        throw error;
      });
  }

  return migrationPromise;
}
