"use client";

import Link from "next/link";
import slugify from "slugify";
import { useMemo, useId, useState } from "react";

import {
  DataTable,
  Panel,
  StatusPill,
} from "../_components/dashboard-ui";
import {
  DEFAULT_SECTIONS,
  INDUSTRIES,
} from "@/lib/agents/site-options";
import {
  getScrollBuildOptions,
  submitBuildSiteRequest,
  type ScrollBuildOptions,
} from "@/lib/agents/scroll-build-options";
import {
  clearLeadsSearchState,
  getLeadsSearchState,
  persistLeadsSearchState,
  persistLeadsSearchStateFull,
} from "@/lib/leads/search-state";
import type { LeadSearchResult } from "@/lib/leads/types";

import { ScrollBuildOptionsField } from "../_components/scroll-build-options-field";

const inputClassName =
  "w-full rounded-lg border border-neutral-300 bg-white px-4 py-2.5 text-neutral-900 outline-none transition placeholder:text-neutral-400 focus:border-neutral-900 focus:ring-2 focus:ring-neutral-200";

type BuildState = {
  loading: boolean;
  html?: string;
  siteSlug?: string;
  error?: string;
  previewError?: string;
};

function googleSearchUrl(businessName: string): string {
  return `https://www.google.com/search?${new URLSearchParams({
    q: businessName,
  }).toString()}`;
}

function FacebookIcon() {
  return (
    <svg
      width="17"
      height="17"
      viewBox="0 0 24 24"
      aria-hidden="true"
      className="shrink-0"
    >
      <circle cx="12" cy="12" r="12" fill="#1877F2" />
      <path
        d="M15.5 8.5h-2.1c-.4 0-.7.3-.7.7v1.6H15l-.3 2.4h-1.9v7.3h-2.8v-7.3H8.5V11h1.5V9.1c0-2 1.2-3.1 3-3.1h2v2.5z"
        fill="#fff"
      />
    </svg>
  );
}

function InstagramIcon() {
  const gradientId = useId();

  return (
    <svg
      width="17"
      height="17"
      viewBox="0 0 24 24"
      aria-hidden="true"
      className="shrink-0"
    >
      <defs>
        <linearGradient id={gradientId} x1="0%" y1="100%" x2="100%" y2="0%">
          <stop offset="0%" stopColor="#F58529" />
          <stop offset="50%" stopColor="#DD2A7B" />
          <stop offset="100%" stopColor="#8134AF" />
        </linearGradient>
      </defs>
      <rect width="24" height="24" rx="6" fill={`url(#${gradientId})`} />
      <circle cx="12" cy="12" r="4.2" fill="none" stroke="#fff" strokeWidth="1.8" />
      <circle cx="17.2" cy="6.8" r="1.2" fill="#fff" />
    </svg>
  );
}

function SocialMediaIcons({
  facebookUrl,
  instagramUrl,
}: {
  facebookUrl?: string | null;
  instagramUrl?: string | null;
}) {
  if (!facebookUrl && !instagramUrl) {
    return null;
  }

  return (
    <span className="inline-flex items-center gap-1.5">
      {facebookUrl ? (
        <a
          href={facebookUrl}
          target="_blank"
          rel="noopener noreferrer"
          title="Facebook"
          aria-label="Facebook page"
          className="inline-flex transition hover:opacity-80"
        >
          <FacebookIcon />
        </a>
      ) : null}
      {instagramUrl ? (
        <a
          href={instagramUrl}
          target="_blank"
          rel="noopener noreferrer"
          title="Instagram"
          aria-label="Instagram page"
          className="inline-flex transition hover:opacity-80"
        >
          <InstagramIcon />
        </a>
      ) : null}
    </span>
  );
}

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
  const [city, setCity] = useState(() => getLeadsSearchState().city);
  const [industry, setIndustry] = useState(
    () => getLeadsSearchState().industry,
  );
  const [results, setResults] = useState<LeadSearchResult[]>(
    () => getLeadsSearchState().results,
  );
  const [hasSearched, setHasSearched] = useState(
    () => getLeadsSearchState().hasSearched,
  );
  const [showExistingSites, setShowExistingSites] = useState(
    () => getLeadsSearchState().showExistingSites,
  );
  const [searching, setSearching] = useState(false);
  const [searchError, setSearchError] = useState<string | null>(null);
  const [buildStates, setBuildStates] = useState<Record<string, BuildState>>({});
  const [scrollBuildOptionsById, setScrollBuildOptionsById] = useState<
    Record<string, ScrollBuildOptions>
  >({});
  const [selectedLeads, setSelectedLeads] = useState<Set<string>>(new Set());
  const [queueSuccessMessage, setQueueSuccessMessage] = useState<string | null>(
    null,
  );
  const [addingToQueue, setAddingToQueue] = useState(false);

  function handleClearSearch() {
    clearLeadsSearchState();
    setCity("");
    setIndustry(INDUSTRIES[0]);
    setResults([]);
    setHasSearched(false);
    setShowExistingSites(false);
    setSearchError(null);
    setBuildStates({});
    setScrollBuildOptionsById({});
    setSelectedLeads(new Set());
  }

  async function handleSearch(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSearching(true);
    setSearchError(null);
    setHasSearched(true);
    setResults([]);
    setBuildStates({});
    setScrollBuildOptionsById({});
    persistLeadsSearchState({ hasSearched: true, results: [] });

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

      const leads = data.leads ?? [];
      setResults(leads);
      persistLeadsSearchStateFull(city, industry, leads, showExistingSites);
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
      const scroll = getScrollBuildOptions(scrollBuildOptionsById, lead.placeId);

      console.log("[leads-search] build scroll options:", {
        placeId: lead.placeId,
        businessName: lead.businessName,
        scrollAnimationEffect: scroll.scrollAnimationEffect,
        scrollHeroMediaType: scroll.scrollHeroMediaType,
        scrollHeroSequencePresetId: scroll.scrollHeroSequencePresetId,
        scrollHeroPresetId: scroll.scrollHeroPresetId,
        hasVideoFile: Boolean(scroll.scrollHeroVideoFile),
      });

      const response = await submitBuildSiteRequest(
        {
          businessName: lead.businessName,
          city: lead.city,
          industry: lead.industry,
          placeId: lead.placeId,
          address: lead.address,
          existingWebsiteUrl: lead.website,
          hasWebsite: lead.websiteStatus === "has_site",
          paletteId: "midnight",
          styleId: "modern-minimal",
          sections: DEFAULT_SECTIONS,
          createLogoForMe: true,
        },
        scroll,
      );

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
          <input
            key="select"
            type="checkbox"
            checked={selectedLeads.has(lead.placeId)}
            onChange={() => {
              setSelectedLeads((current) => {
                const next = new Set(current);
                if (next.has(lead.placeId)) {
                  next.delete(lead.placeId);
                } else {
                  next.add(lead.placeId);
                }
                return next;
              });
            }}
            className="h-4 w-4 rounded border-neutral-300"
          />,
          <div key="business" className="space-y-1">
            <div className="flex flex-wrap items-center gap-2">
              <a
                href={googleSearchUrl(lead.businessName)}
                target="_blank"
                rel="noopener noreferrer"
                className="font-medium text-neutral-900 hover:text-neutral-700 hover:underline"
              >
                {lead.businessName}
              </a>
              <SocialMediaIcons
                facebookUrl={lead.facebookUrl}
                instagramUrl={lead.instagramUrl}
              />
            </div>
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
    [buildStates, visibleResults, selectedLeads],
  );

  const rowFooters = useMemo(
    () =>
      visibleResults.map((lead) => {
        const buildState = buildStates[lead.placeId];
        if (buildState?.loading || buildState?.html) {
          return null;
        }

        return (
          <ScrollBuildOptionsField
            fieldId={lead.placeId}
            options={getScrollBuildOptions(scrollBuildOptionsById, lead.placeId)}
            onChange={(next) =>
              setScrollBuildOptionsById((current) => ({
                ...current,
                [lead.placeId]: next,
              }))
            }
            industry={lead.industry}
            disabled={buildState?.loading}
          />
        );
      }),
    [buildStates, scrollBuildOptionsById, visibleResults],
  );

  async function handleAddToOutreachQueue() {
    setQueueSuccessMessage(null);
    setAddingToQueue(true);

    try {
      const leads = visibleResults
        .filter((lead) => selectedLeads.has(lead.placeId))
        .map((lead) => ({
          businessName: lead.businessName,
          city: lead.city,
          industry: lead.industry,
          address: lead.address,
          phone: lead.phone,
          siteSlug: buildStates[lead.placeId]?.siteSlug,
        }));

      const response = await fetch("/api/outreach-queue", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ leads }),
      });

      const data = (await response.json()) as { error?: string };

      if (!response.ok) {
        throw new Error(data.error ?? "Failed to add to Outreach Queue.");
      }

      setSelectedLeads(new Set());
      setQueueSuccessMessage("Added to Outreach Queue");
    } catch (error) {
      setSearchError(
        error instanceof Error
          ? error.message
          : "Failed to add to Outreach Queue.",
      );
    } finally {
      setAddingToQueue(false);
    }
  }

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
              onChange={(event) => {
                const value = event.target.value;
                setCity(value);
                persistLeadsSearchState({ city: value });
              }}
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
              onChange={(event) => {
                const value = event.target.value;
                setIndustry(value);
                persistLeadsSearchState({ industry: value });
              }}
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
          <div className="flex items-end gap-2">
            <button
              type="submit"
              disabled={searching}
              className="w-full rounded-lg bg-neutral-900 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-neutral-800 disabled:cursor-not-allowed disabled:opacity-60"
            >
              {searching ? "Searching..." : "Search Leads"}
            </button>
            {hasSearched ? (
              <button
                type="button"
                onClick={handleClearSearch}
                disabled={searching}
                className="shrink-0 rounded-lg border border-neutral-300 bg-white px-4 py-2.5 text-sm font-medium text-neutral-700 transition hover:bg-neutral-50 disabled:cursor-not-allowed disabled:opacity-60"
              >
                Clear
              </button>
            ) : null}
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
                onChange={(event) => {
                  const checked = event.target.checked;
                  setShowExistingSites(checked);
                  persistLeadsSearchState({ showExistingSites: checked });
                  if (hasSearched) {
                    persistLeadsSearchStateFull(
                      city,
                      industry,
                      results,
                      checked,
                    );
                  }
                }}
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
              "Select",
              "Business",
              "Address",
              "Phone",
              "Rating",
              "Reviews",
              "Status",
              "Action",
            ]}
            rows={rows}
            rowFooters={rowFooters}
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

      {selectedLeads.size > 0 ? (
        <div className="sticky bottom-0 z-10 flex items-center justify-between gap-4 rounded-xl border border-neutral-200 bg-white px-5 py-4 shadow-lg">
          <p className="text-sm font-medium text-neutral-900">
            {selectedLeads.size} business
            {selectedLeads.size === 1 ? "" : "es"} selected
          </p>
          <button
            type="button"
            onClick={() => void handleAddToOutreachQueue()}
            disabled={addingToQueue}
            className="rounded-lg bg-neutral-900 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-neutral-800 disabled:cursor-not-allowed disabled:opacity-60"
          >
            {addingToQueue ? "Adding..." : "Add to Outreach Queue"}
          </button>
        </div>
      ) : null}

      {queueSuccessMessage ? (
        <div
          className="rounded-xl border border-emerald-200 bg-emerald-50 px-5 py-4"
          role="status"
        >
          <p className="text-sm font-medium text-emerald-800">
            {queueSuccessMessage}
          </p>
        </div>
      ) : null}
    </div>
  );
}
