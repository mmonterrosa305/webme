"use client";

import Link from "next/link";
import slugify from "slugify";
import { useMemo, useState } from "react";

import {
  DataTable,
  Panel,
  StatusPill,
} from "../_components/dashboard-ui";
import {
  DEFAULT_SECTIONS,
  INDUSTRIES,
} from "@/lib/agents/site-options";
import type { LeadSearchResult } from "@/lib/leads/types";

const inputClassName =
  "w-full rounded-lg border border-neutral-300 bg-white px-4 py-2.5 text-neutral-900 outline-none transition placeholder:text-neutral-400 focus:border-neutral-900 focus:ring-2 focus:ring-neutral-200";

type BuildState = {
  loading: boolean;
  html?: string;
  siteSlug?: string;
  error?: string;
  previewError?: string;
};

function downloadHtmlFile(name: string, html: string) {
  const filename = `${slugify(name || "website", {
    lower: true,
    strict: true,
  })}.html`;
  const blob = new Blob([html], { type: "text/html;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = filename;
  anchor.click();
  URL.revokeObjectURL(url);
}

function openHtmlPreview(html: string): string | null {
  const blob = new Blob([html], { type: "text/html;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const previewWindow = window.open(url, "_blank", "noopener,noreferrer");

  if (!previewWindow) {
    URL.revokeObjectURL(url);
    return "Popup blocked. Use the preview link or allow popups for this site.";
  }

  window.setTimeout(() => {
    URL.revokeObjectURL(url);
  }, 60_000);

  return null;
}

export function LeadsSearch() {
  const [city, setCity] = useState("");
  const [industry, setIndustry] = useState<string>(INDUSTRIES[0]);
  const [showExistingSites, setShowExistingSites] = useState(false);
  const [searching, setSearching] = useState(false);
  const [searchError, setSearchError] = useState<string | null>(null);
  const [hasSearched, setHasSearched] = useState(false);
  const [results, setResults] = useState<LeadSearchResult[]>([]);
  const [buildStates, setBuildStates] = useState<Record<string, BuildState>>({});

  async function handleSearch(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSearching(true);
    setSearchError(null);
    setHasSearched(true);
    setResults([]);
    setBuildStates({});

    try {
      const response = await fetch("/api/leads/search", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ city, industry }),
      });

      const data = (await response.json()) as {
        leads?: LeadSearchResult[];
        error?: string;
      };

      if (!response.ok) {
        throw new Error(data.error ?? "Failed to search leads.");
      }

      setResults(data.leads ?? []);
    } catch (error) {
      setSearchError(
        error instanceof Error ? error.message : "Failed to search leads.",
      );
    } finally {
      setSearching(false);
    }
  }

  async function handleBuildSite(lead: LeadSearchResult) {
    setBuildStates((current) => ({
      ...current,
      [lead.placeId]: { loading: true },
    }));

    try {
      const response = await fetch("/api/agents/build-site", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          businessName: lead.businessName,
          city: lead.city,
          industry: lead.industry,
          address: lead.address,
          existingWebsiteUrl: lead.website,
          hasWebsite: lead.websiteStatus === "has_site",
          paletteId: "midnight",
          styleId: "modern-minimal",
          sections: DEFAULT_SECTIONS,
          createLogoForMe: true,
        }),
      });

      const data = (await response.json()) as {
        html?: string;
        htmlB?: string;
        siteSlug?: string;
        siteSlugB?: string;
        error?: string;
      };

      if (!response.ok || !data.html) {
        throw new Error(data.error ?? "Failed to build site.");
      }

      setBuildStates((current) => ({
        ...current,
        [lead.placeId]: {
          loading: false,
          html: data.html,
          siteSlug: data.siteSlug,
        },
      }));

      window.dispatchEvent(new CustomEvent("webme:leads-saved"));
    } catch (error) {
      setBuildStates((current) => ({
        ...current,
        [lead.placeId]: {
          loading: false,
          error: error instanceof Error ? error.message : "Failed to build site.",
        },
      }));
    }
  }

  const visibleResults = useMemo(
    () =>
      showExistingSites
        ? results
        : results.filter((lead) => lead.websiteStatus === "no_website"),
    [results, showExistingSites],
  );

  const rows = useMemo(
    () =>
      visibleResults.map((lead) => {
        const buildState = buildStates[lead.placeId];
        const statusConfig =
          lead.websiteStatus === "no_website"
            ? { label: "No website", variant: "success" as const }
            : lead.websiteStatus === "has_site_review"
              ? { label: "Has site - review", variant: "warning" as const }
              : { label: "Has site", variant: "default" as const };

        return [
          <div key="business" className="space-y-1">
            <span className="block font-medium text-neutral-900">
              {lead.businessName}
            </span>
            <span className="block text-xs text-neutral-500">
              {lead.industry}
            </span>
          </div>,
          <span key="address" className="text-neutral-600">
            {lead.address ?? "—"}
          </span>,
          <span key="phone" className="text-neutral-600">
            {lead.phone ?? "—"}
          </span>,
          <span key="rating" className="text-neutral-700">
            {lead.rating ? `${lead.rating.toFixed(1)} / 5` : "—"}
          </span>,
          <span key="reviews" className="text-neutral-500">
            {lead.reviewCount ?? "—"}
          </span>,
          <StatusPill
            key="status"
            label={statusConfig.label}
            variant={statusConfig.variant}
          />,
          <div key="actions" className="space-y-2">
            <button
              type="button"
              onClick={() => handleBuildSite(lead)}
              disabled={buildState?.loading}
              className="rounded-lg bg-neutral-900 px-3 py-2 text-sm font-medium text-white transition hover:bg-neutral-800 disabled:cursor-not-allowed disabled:opacity-60"
            >
              {buildState?.loading ? "Building..." : "Build Site"}
            </button>
            {buildState?.html ? (
              <div className="flex flex-col gap-2">
                {buildState.siteSlug ? (
                  <Link
                    href={`/preview/${buildState.siteSlug}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-sm font-medium text-neutral-700 hover:text-neutral-900"
                  >
                    Preview Site
                  </Link>
                ) : (
                  <button
                    type="button"
                    onClick={() => {
                      const previewError = openHtmlPreview(buildState.html!);
                      if (previewError) {
                        setBuildStates((current) => ({
                          ...current,
                          [lead.placeId]: {
                            ...current[lead.placeId],
                            previewError,
                          },
                        }));
                      }
                    }}
                    className="text-left text-sm font-medium text-neutral-700 hover:text-neutral-900"
                  >
                    Preview Site
                  </button>
                )}
                {buildState.previewError ? (
                  <p className="max-w-48 text-xs text-amber-700">
                    {buildState.previewError}
                  </p>
                ) : null}
                <button
                  type="button"
                  onClick={() =>
                    downloadHtmlFile(lead.businessName, buildState.html!)
                  }
                  className="text-left text-sm font-medium text-neutral-700 hover:text-neutral-900"
                >
                  Download HTML
                </button>
              </div>
            ) : null}
            {buildState?.error ? (
              <p className="max-w-48 text-xs text-red-600">{buildState.error}</p>
            ) : null}
          </div>,
        ];
      }),
    [buildStates, visibleResults],
  );

  return (
    <div className="space-y-8">
      <Panel
        title="Find leads"
        subtitle="Search Google Places for businesses in a city or zip code, then classify whether they have a website, might have one, or clearly need one."
      >
        <form
          onSubmit={handleSearch}
          className="grid gap-4 px-5 py-5 sm:grid-cols-[minmax(0,1fr)_220px_auto]"
        >
          <div>
            <label
              htmlFor="city"
              className="mb-2 block text-sm font-medium text-neutral-700"
            >
              City or Zip Code
            </label>
            <input
              id="city"
              type="text"
              required
              value={city}
              onChange={(event) => setCity(event.target.value)}
              placeholder="Miami or 33165"
              className={inputClassName}
              disabled={searching}
            />
          </div>
          <div>
            <label
              htmlFor="industry"
              className="mb-2 block text-sm font-medium text-neutral-700"
            >
              Industry
            </label>
            <select
              id="industry"
              value={industry}
              onChange={(event) => setIndustry(event.target.value)}
              className={inputClassName}
              disabled={searching}
            >
              {INDUSTRIES.map((option) => (
                <option key={option} value={option}>
                  {option}
                </option>
              ))}
            </select>
          </div>
          <div className="flex items-end">
            <button
              type="submit"
              disabled={searching}
              className="w-full rounded-lg bg-neutral-900 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-neutral-800 disabled:cursor-not-allowed disabled:opacity-60"
            >
              {searching ? "Searching..." : "Search Leads"}
            </button>
          </div>
        </form>
        {searchError ? (
          <p className="px-5 pb-5 text-sm text-red-600" role="alert">
            {searchError}
          </p>
        ) : null}
      </Panel>

      <Panel
        title="Lead results"
        subtitle={
          hasSearched
            ? `${visibleResults.length} businesses shown`
            : "Run a search to populate leads"
        }
      >
        {hasSearched ? (
          <div className="border-b border-neutral-200 px-5 py-4">
            <label className="flex cursor-pointer items-center gap-3 text-sm text-neutral-700">
              <input
                type="checkbox"
                checked={showExistingSites}
                onChange={(event) => setShowExistingSites(event.target.checked)}
                className="h-4 w-4 rounded border-neutral-300 text-neutral-900 focus:ring-neutral-900"
              />
              <span>
                Also show businesses with existing sites (redesign opportunities)
              </span>
            </label>
          </div>
        ) : null}

        {visibleResults.length > 0 ? (
          <DataTable
            columns={[
              "Business",
              "Address",
              "Phone",
              "Rating",
              "Reviews",
              "Status",
              "Action",
            ]}
            rows={rows}
          />
        ) : (
          <div className="px-5 py-10 text-sm text-neutral-500">
            {hasSearched
              ? showExistingSites
                ? "No businesses matched this search."
                : "No confirmed no-website leads were found. Turn on redesign opportunities to review businesses that may already have a site."
              : "Search by city and industry to find businesses that need a website."}
          </div>
        )}
      </Panel>
    </div>
  );
}
