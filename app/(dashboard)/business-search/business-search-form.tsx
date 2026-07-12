"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";

import type { BusinessSearchResult } from "@/lib/leads/business-search-types";
import { SCROLL_HERO_VIDEO_FIELD } from "@/lib/agents/upload-scroll-hero-video";
import type { ScrollHeroMediaType } from "@/lib/agents/scroll-build-options";
import { SCROLL_HERO_SEQUENCE_PRESET_FIELD } from "@/lib/image-sequences/types";

import { Panel } from "../_components/dashboard-ui";
import { ScrollAnimationBuildOptions } from "../_components/scroll-animation-build-options";

const inputClassName =
  "w-full rounded-lg border border-neutral-300 bg-white px-4 py-2.5 text-neutral-900 outline-none transition placeholder:text-neutral-400 focus:border-neutral-900 focus:ring-2 focus:ring-neutral-200";

type Phase = "idle" | "searching" | "building" | "done" | "error";

type BuildResult = {
  siteSlug: string;
  businessName: string;
  ownerEmail: string | null;
};

function InfoRow({
  label,
  value,
  href,
}: {
  label: string;
  value: string | null | undefined;
  href?: string;
}) {
  if (!value?.trim()) {
    return null;
  }

  return (
    <div>
      <p className="text-xs font-semibold uppercase tracking-wide text-neutral-500">
        {label}
      </p>
      {href ? (
        <a
          href={href}
          target="_blank"
          rel="noopener noreferrer"
          className="mt-1 block text-sm text-neutral-900 underline decoration-neutral-300 underline-offset-2 hover:text-neutral-700"
        >
          {value}
        </a>
      ) : (
        <p className="mt-1 text-sm text-neutral-900">{value}</p>
      )}
    </div>
  );
}

function BusinessResultCard({
  business,
  onBuild,
  building,
  scrollAnimationEffect,
  onScrollAnimationEffectChange,
  cardHoverEffect,
  onCardHoverEffectChange,
  scrollHeroVideoFile,
  onScrollHeroVideoFileChange,
  scrollHeroPresetId,
  onScrollHeroPresetIdChange,
  scrollHeroMediaType,
  onScrollHeroMediaTypeChange,
  scrollHeroSequencePresetId,
  onScrollHeroSequencePresetIdChange,
}: {
  business: BusinessSearchResult;
  onBuild: () => void;
  building: boolean;
  scrollAnimationEffect: boolean;
  onScrollAnimationEffectChange: (checked: boolean) => void;
  cardHoverEffect: boolean;
  onCardHoverEffectChange: (checked: boolean) => void;
  scrollHeroVideoFile: File | null;
  onScrollHeroVideoFileChange: (file: File | null) => void;
  scrollHeroPresetId: string | null;
  onScrollHeroPresetIdChange: (presetId: string | null) => void;
  scrollHeroMediaType: ScrollHeroMediaType;
  onScrollHeroMediaTypeChange: (mediaType: ScrollHeroMediaType) => void;
  scrollHeroSequencePresetId: string | null;
  onScrollHeroSequencePresetIdChange: (sequenceId: string | null) => void;
}) {
  const website = business.websiteData;

  return (
    <div className="space-y-5 border-t border-neutral-200 px-5 py-5">
      <div>
        <p className="text-xs font-semibold uppercase tracking-wide text-neutral-500">
          Found business
        </p>
        <h3 className="mt-1 text-xl font-semibold text-neutral-900">
          {business.businessName}
        </h3>
        <p className="mt-1 text-sm text-neutral-600">
          {business.city} · {business.industry}
        </p>
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <InfoRow label="Phone" value={business.phone} />
        <InfoRow
          label="Rating"
          value={
            business.rating
              ? `${business.rating.toFixed(1)} / 5 (${business.reviewCount ?? 0} reviews)`
              : null
          }
        />
        <InfoRow label="Address" value={business.address} />
        <InfoRow label="Website" value={business.website} href={business.website ?? undefined} />
      </div>

      {business.hours.length > 0 ? (
        <div>
          <p className="text-xs font-semibold uppercase tracking-wide text-neutral-500">
            Hours
          </p>
          <ul className="mt-2 space-y-1 text-sm text-neutral-800">
            {business.hours.map((line) => (
              <li key={line}>{line}</li>
            ))}
          </ul>
        </div>
      ) : null}

      {business.description ? (
        <InfoRow label="Description" value={business.description} />
      ) : null}

      {business.services.length > 0 ? (
        <div>
          <p className="text-xs font-semibold uppercase tracking-wide text-neutral-500">
            Services
          </p>
          <div className="mt-2 flex flex-wrap gap-2">
            {business.services.map((service) => (
              <span
                key={service}
                className="rounded-full border border-neutral-200 bg-neutral-50 px-3 py-1 text-xs font-medium text-neutral-700"
              >
                {service}
              </span>
            ))}
          </div>
        </div>
      ) : null}

      {website ? (
        <div className="rounded-xl border border-neutral-200 bg-neutral-50 p-4">
          <p className="text-xs font-semibold uppercase tracking-wide text-neutral-500">
            From website scrape
          </p>
          {website.scrapeError ? (
            <p className="mt-2 text-sm text-amber-700">{website.scrapeError}</p>
          ) : (
            <div className="mt-3 space-y-3">
              <InfoRow label="Headline" value={website.headline} />
              <InfoRow label="Tagline" value={website.tagline} />
              {website.adCopy.length > 0 ? (
                <div>
                  <p className="text-xs font-semibold uppercase tracking-wide text-neutral-500">
                    Ad copy
                  </p>
                  <ul className="mt-2 list-disc space-y-1 pl-5 text-sm text-neutral-800">
                    {website.adCopy.map((line) => (
                      <li key={line}>{line}</li>
                    ))}
                  </ul>
                </div>
              ) : null}
            </div>
          )}
        </div>
      ) : (
        <p className="text-sm text-neutral-600">
          No website on Google — we&apos;ll build the site from Google Places info.
        </p>
      )}

      <div className="flex flex-wrap items-end gap-4">
        <ScrollAnimationBuildOptions
          checked={scrollAnimationEffect}
          onCheckedChange={onScrollAnimationEffectChange}
          cardHoverChecked={cardHoverEffect}
          onCardHoverCheckedChange={onCardHoverEffectChange}
          disabled={building}
          industry={business.industry}
          scrollHeroMediaType={scrollHeroMediaType}
          onScrollHeroMediaTypeChange={onScrollHeroMediaTypeChange}
          videoFile={scrollHeroVideoFile}
          onVideoFileChange={onScrollHeroVideoFileChange}
          selectedPresetId={scrollHeroPresetId}
          onSelectedPresetIdChange={onScrollHeroPresetIdChange}
          selectedSequencePresetId={scrollHeroSequencePresetId}
          onSelectedSequencePresetIdChange={onScrollHeroSequencePresetIdChange}
        />

        <button
          type="button"
          disabled={building}
          onClick={onBuild}
          className="rounded-lg bg-neutral-900 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-neutral-800 disabled:cursor-not-allowed disabled:opacity-60"
        >
          {building ? "Building site..." : "Build Site"}
        </button>
      </div>
    </div>
  );
}

export function BusinessSearchForm() {
  const [businessName, setBusinessName] = useState("");
  const [city, setCity] = useState("");
  const [phase, setPhase] = useState<Phase>("idle");
  const [error, setError] = useState<string | null>(null);
  const [business, setBusiness] = useState<BusinessSearchResult | null>(null);
  const [result, setResult] = useState<BuildResult | null>(null);
  const [sendingToQueue, setSendingToQueue] = useState(false);
  const [queueSuccessMessage, setQueueSuccessMessage] = useState<string | null>(
    null,
  );
  const [queueError, setQueueError] = useState<string | null>(null);
  const [previewEmail, setPreviewEmail] = useState("");
  const [sendingPreviewEmail, setSendingPreviewEmail] = useState(false);
  const [previewEmailError, setPreviewEmailError] = useState<string | null>(
    null,
  );
  const [previewEmailSent, setPreviewEmailSent] = useState(false);
  const [showPreviewEmailToast, setShowPreviewEmailToast] = useState(false);
  const previewEmailToastTimerRef = useRef<number | null>(null);
  const [scrollAnimationEffect, setScrollAnimationEffect] = useState(false);
  const [cardHoverEffect, setCardHoverEffect] = useState(false);
  const [scrollHeroVideoFile, setScrollHeroVideoFile] = useState<File | null>(
    null,
  );
  const [scrollHeroPresetId, setScrollHeroPresetId] = useState<string | null>(
    null,
  );
  const [scrollHeroSequencePresetId, setScrollHeroSequencePresetId] = useState<
    string | null
  >(null);
  const [scrollHeroMediaType, setScrollHeroMediaType] =
    useState<ScrollHeroMediaType>("video");

  const isSearching = phase === "searching";
  const isBuilding = phase === "building";

  useEffect(() => {
    return () => {
      if (previewEmailToastTimerRef.current) {
        window.clearTimeout(previewEmailToastTimerRef.current);
      }
    };
  }, []);

  async function handleSearch(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    setBusiness(null);
    setResult(null);
    setQueueSuccessMessage(null);
    setQueueError(null);
    setPreviewEmail("");
    setPreviewEmailError(null);
    setPreviewEmailSent(false);
    setShowPreviewEmailToast(false);
    setPhase("searching");

    try {
      const response = await fetch("/api/business-search", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ businessName, city }),
      });

      const data = (await response.json()) as {
        business?: BusinessSearchResult;
        error?: string;
      };

      if (!response.ok || !data.business) {
        throw new Error(data.error ?? "Failed to find business.");
      }

      setBusiness(data.business);
      setPhase("idle");
    } catch (searchError) {
      setPhase("error");
      setError(
        searchError instanceof Error
          ? searchError.message
          : "Failed to find business.",
      );
    }
  }

  async function handleBuildSite() {
    if (!business) {
      return;
    }

    setPhase("building");
    setError(null);
    setResult(null);
    setQueueSuccessMessage(null);
    setQueueError(null);
    setPreviewEmailError(null);
    setPreviewEmailSent(false);
    setShowPreviewEmailToast(false);

    try {
      let response: Response;

      if (scrollHeroVideoFile) {
        const formData = new FormData();
        formData.append("business", JSON.stringify(business));
        formData.append(
          "scrollAnimationEffect",
          scrollAnimationEffect ? "true" : "false",
        );
        formData.append("cardHoverEffect", cardHoverEffect ? "true" : "false");
        formData.append("scrollHeroMediaType", scrollHeroMediaType);
        if (scrollHeroPresetId) {
          formData.append("scrollHeroPresetId", scrollHeroPresetId);
        }
        if (scrollHeroSequencePresetId) {
          formData.append(
            SCROLL_HERO_SEQUENCE_PRESET_FIELD,
            scrollHeroSequencePresetId,
          );
        }
        formData.append(SCROLL_HERO_VIDEO_FIELD, scrollHeroVideoFile);
        response = await fetch("/api/business-search/build-site", {
          method: "POST",
          body: formData,
        });
      } else {
        response = await fetch("/api/business-search/build-site", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            business,
            scrollAnimationEffect,
            cardHoverEffect,
            scrollHeroMediaType,
            scrollHeroPresetId: scrollHeroPresetId ?? undefined,
            scrollHeroSequencePresetId: scrollHeroSequencePresetId ?? undefined,
          }),
        });
      }

      const data = (await response.json()) as {
        siteSlug?: string;
        businessName?: string;
        ownerEmail?: string | null;
        error?: string;
      };

      if (!response.ok || !data.siteSlug) {
        throw new Error(data.error ?? "Failed to build site.");
      }

      const discoveredEmail = data.ownerEmail?.trim() || null;

      setResult({
        siteSlug: data.siteSlug,
        businessName: data.businessName ?? business.businessName,
        ownerEmail: discoveredEmail,
      });
      setPreviewEmail(discoveredEmail ?? "");
      setPhase("done");
    } catch (buildError) {
      setPhase("error");
      setError(
        buildError instanceof Error
          ? buildError.message
          : "Failed to build site.",
      );
    }
  }

  async function handleSendPreviewEmail() {
    if (!result?.siteSlug) {
      return;
    }

    const email = previewEmail.trim() || result.ownerEmail?.trim() || "";

    if (!email) {
      setPreviewEmailError("Failed to send — try again");
      setPreviewEmailSent(false);
      setShowPreviewEmailToast(false);
      return;
    }

    setSendingPreviewEmail(true);
    setPreviewEmailError(null);

    try {
      const response = await fetch("/api/business-search/send-preview-email", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          siteSlug: result.siteSlug,
          ownerEmail: email,
        }),
      });

      const data = (await response.json()) as { error?: string };

      if (!response.ok) {
        throw new Error(data.error ?? "Failed to send preview email.");
      }

      // Show toast first, then mark as sent so the toast branch wins in JSX.
      setShowPreviewEmailToast(true);
      setPreviewEmailSent(true);

      if (previewEmailToastTimerRef.current) {
        window.clearTimeout(previewEmailToastTimerRef.current);
      }
      previewEmailToastTimerRef.current = window.setTimeout(() => {
        setShowPreviewEmailToast(false);
        previewEmailToastTimerRef.current = null;
      }, 2500);
    } catch (sendError) {
      console.error("[business-search] Preview email send error", sendError);
      setPreviewEmailSent(false);
      setShowPreviewEmailToast(false);
      setPreviewEmailError("Failed to send — try again");
    } finally {
      setSendingPreviewEmail(false);
    }
  }

  function handleSendPreviewEmailAgain() {
    setPreviewEmailSent(false);
    setShowPreviewEmailToast(false);
    setPreviewEmailError(null);
    if (previewEmailToastTimerRef.current) {
      window.clearTimeout(previewEmailToastTimerRef.current);
      previewEmailToastTimerRef.current = null;
    }
  }

  async function handleSendToOutreachQueue() {
    if (!result?.siteSlug) {
      return;
    }

    setSendingToQueue(true);
    setQueueSuccessMessage(null);
    setQueueError(null);

    try {
      const response = await fetch("/api/import-site/send-to-outreach", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ siteSlug: result.siteSlug }),
      });

      const data = (await response.json()) as { error?: string };

      if (!response.ok) {
        throw new Error(data.error ?? "Failed to add to Outreach Queue.");
      }

      setQueueSuccessMessage("Added to Outreach Queue!");
    } catch (sendError) {
      setQueueError(
        sendError instanceof Error
          ? sendError.message
          : "Failed to add to Outreach Queue.",
      );
    } finally {
      setSendingToQueue(false);
    }
  }

  return (
    <div className="space-y-6">
      {showPreviewEmailToast ? (
        <div
          className="fixed bottom-6 right-6 z-[100] flex items-center gap-2 rounded-xl border border-emerald-300 bg-emerald-50 px-4 py-3 text-sm font-semibold text-emerald-900 shadow-lg"
          role="status"
        >
          <span aria-hidden>✓</span>
          Preview email sent!
        </div>
      ) : null}
      <Panel
        title="Search by business name"
        subtitle="Look up a business on Google Places, enrich it from their website when available, then build a WebMe site."
      >
        <form
          onSubmit={(event) => void handleSearch(event)}
          className="grid gap-4 px-5 py-5 sm:grid-cols-2"
        >
          <div>
            <label
              htmlFor="businessSearchName"
              className="mb-2 block text-sm font-medium text-neutral-700"
            >
              Business Name
            </label>
            <input
              id="businessSearchName"
              type="text"
              required
              value={businessName}
              onChange={(event) => setBusinessName(event.target.value)}
              placeholder="Blue Pool Service"
              className={inputClassName}
              disabled={isSearching || isBuilding}
            />
          </div>
          <div>
            <label
              htmlFor="businessSearchCity"
              className="mb-2 block text-sm font-medium text-neutral-700"
            >
              City
            </label>
            <input
              id="businessSearchCity"
              type="text"
              required
              value={city}
              onChange={(event) => setCity(event.target.value)}
              placeholder="Boca Raton"
              className={inputClassName}
              disabled={isSearching || isBuilding}
            />
          </div>
          <div className="sm:col-span-2">
            <button
              type="submit"
              disabled={isSearching || isBuilding || !businessName.trim() || !city.trim()}
              className="rounded-lg bg-neutral-900 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-neutral-800 disabled:cursor-not-allowed disabled:opacity-60"
            >
              {isSearching ? "Searching..." : "Search"}
            </button>
          </div>
        </form>

        {isSearching ? (
          <div className="border-t border-neutral-200 px-5 py-4">
            <div className="flex items-center gap-3 text-sm text-neutral-700">
              <span
                className="inline-block h-4 w-4 animate-spin rounded-full border-2 border-neutral-300 border-t-neutral-900"
                aria-hidden
              />
              <span>Searching Google Places and scraping website...</span>
            </div>
          </div>
        ) : null}

        {error ? (
          <div className="border-t border-neutral-200 px-5 py-4">
            <p className="text-sm font-medium text-red-700" role="alert">
              {error}
            </p>
          </div>
        ) : null}

        {business && !result ? (
          <BusinessResultCard
            business={business}
            onBuild={() => void handleBuildSite()}
            building={isBuilding}
            scrollAnimationEffect={scrollAnimationEffect}
            onScrollAnimationEffectChange={(checked) => {
              setScrollAnimationEffect(checked);
              if (!checked) {
                setScrollHeroVideoFile(null);
                setScrollHeroPresetId(null);
                setScrollHeroSequencePresetId(null);
                setScrollHeroMediaType("video");
              }
            }}
            cardHoverEffect={cardHoverEffect}
            onCardHoverEffectChange={setCardHoverEffect}
            scrollHeroMediaType={scrollHeroMediaType}
            onScrollHeroMediaTypeChange={setScrollHeroMediaType}
            scrollHeroVideoFile={scrollHeroVideoFile}
            onScrollHeroVideoFileChange={(file) => {
              setScrollHeroVideoFile(file);
              if (file) {
                setScrollHeroPresetId(null);
                setScrollHeroSequencePresetId(null);
                setScrollHeroMediaType("video");
              }
            }}
            scrollHeroPresetId={scrollHeroPresetId}
            onScrollHeroPresetIdChange={(presetId) => {
              setScrollHeroPresetId(presetId);
              if (presetId) {
                setScrollHeroVideoFile(null);
                setScrollHeroSequencePresetId(null);
                setScrollHeroMediaType("video");
              }
            }}
            scrollHeroSequencePresetId={scrollHeroSequencePresetId}
            onScrollHeroSequencePresetIdChange={(sequenceId) => {
              setScrollHeroSequencePresetId(sequenceId);
              if (sequenceId) {
                setScrollHeroPresetId(null);
                setScrollHeroVideoFile(null);
                setScrollHeroMediaType("image-sequence");
              }
            }}
          />
        ) : null}

        {result ? (
          <div className="border-t border-neutral-200 px-5 py-4">
            <p className="text-sm text-neutral-700">
              Site built for{" "}
              <span className="font-semibold text-neutral-900">
                {result.businessName}
              </span>
              .
            </p>
            <div className="mt-3 flex flex-wrap items-center gap-3">
              <Link
                href={`/preview/${result.siteSlug}`}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex rounded-lg bg-neutral-900 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-neutral-800"
              >
                See Site
              </Link>
              <button
                type="button"
                disabled={sendingToQueue}
                onClick={() => void handleSendToOutreachQueue()}
                className="inline-flex rounded-lg border border-neutral-900 bg-white px-4 py-2.5 text-sm font-semibold text-neutral-900 transition hover:bg-neutral-50 disabled:cursor-not-allowed disabled:opacity-60"
              >
                {sendingToQueue ? "Saving..." : "Save & Send to Outreach Queue"}
              </button>
            </div>

            <div className="mt-4 rounded-xl border border-neutral-200 bg-neutral-50 p-4">
              {result.ownerEmail ? (
                <p className="text-sm text-neutral-700">
                  Owner email found:{" "}
                  <span className="font-medium text-neutral-900">
                    {result.ownerEmail}
                  </span>
                </p>
              ) : (
                <div>
                  <label
                    htmlFor="previewOwnerEmail"
                    className="mb-2 block text-sm font-medium text-neutral-700"
                  >
                    Owner email
                  </label>
                  <input
                    id="previewOwnerEmail"
                    type="email"
                    value={previewEmail}
                    onChange={(event) => setPreviewEmail(event.target.value)}
                    placeholder="owner@business.com"
                    className={inputClassName}
                    disabled={sendingPreviewEmail || showPreviewEmailToast}
                  />
                  <p className="mt-1.5 text-xs text-neutral-500">
                    No email found from Google Places — enter one manually.
                  </p>
                </div>
              )}
              {showPreviewEmailToast ? (
                <p
                  className="mt-3 flex items-center gap-1.5 rounded-lg border border-emerald-200 bg-emerald-50 px-3 py-2 text-sm font-medium text-emerald-800"
                  role="status"
                >
                  <span aria-hidden>✓</span>
                  Preview email sent!
                </p>
              ) : previewEmailSent ? (
                <button
                  type="button"
                  onClick={handleSendPreviewEmailAgain}
                  className="mt-3 inline-flex rounded-lg border border-emerald-300 bg-emerald-50 px-4 py-2.5 text-sm font-semibold text-emerald-900 transition hover:bg-emerald-100"
                >
                  Send Again
                </button>
              ) : (
                <button
                  type="button"
                  disabled={
                    sendingPreviewEmail ||
                    (!result.ownerEmail && !previewEmail.trim())
                  }
                  onClick={() => void handleSendPreviewEmail()}
                  className="mt-3 inline-flex rounded-lg bg-emerald-600 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-emerald-500 disabled:cursor-not-allowed disabled:opacity-60"
                >
                  {sendingPreviewEmail ? "Sending..." : "Send Preview Email"}
                </button>
              )}
            </div>

            {previewEmailError ? (
              <p className="mt-3 text-sm font-medium text-red-700" role="alert">
                {previewEmailError}
              </p>
            ) : null}
            {queueSuccessMessage ? (
              <p className="mt-3 text-sm font-medium text-emerald-700" role="status">
                {queueSuccessMessage}
              </p>
            ) : null}
            {queueError ? (
              <p className="mt-3 text-sm font-medium text-red-700" role="alert">
                {queueError}
              </p>
            ) : null}
          </div>
        ) : null}
      </Panel>
    </div>
  );
}
