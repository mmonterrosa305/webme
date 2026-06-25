"use client";

import Link from "next/link";
import { useState } from "react";

import { Panel } from "../_components/dashboard-ui";
import { ScrollAnimationBuildOptions } from "../_components/scroll-animation-build-options";
import { SCROLL_HERO_VIDEO_FIELD } from "@/lib/agents/upload-scroll-hero-video";
import type { ScrollHeroMediaType } from "@/lib/agents/scroll-build-options";
import { SCROLL_HERO_SEQUENCE_PRESET_FIELD } from "@/lib/image-sequences/types";

const inputClassName =
  "w-full rounded-lg border border-neutral-300 bg-white px-4 py-2.5 text-neutral-900 outline-none transition placeholder:text-neutral-400 focus:border-neutral-900 focus:ring-2 focus:ring-neutral-200";

type ImportPhase = "idle" | "extracting" | "building" | "done" | "error";

type ImportResult = {
  siteSlug: string;
  businessName: string;
};

export function ImportSiteForm() {
  const [url, setUrl] = useState("");
  const [phase, setPhase] = useState<ImportPhase>("idle");
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<ImportResult | null>(null);
  const [sendingToQueue, setSendingToQueue] = useState(false);
  const [queueSuccessMessage, setQueueSuccessMessage] = useState<string | null>(
    null,
  );
  const [queueError, setQueueError] = useState<string | null>(null);
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

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    setResult(null);
    setQueueSuccessMessage(null);
    setQueueError(null);
    setPhase("extracting");

    const buildingTimer = window.setTimeout(() => {
      setPhase((current) => (current === "extracting" ? "building" : current));
    }, 2500);

    try {
      let response: Response;

      if (scrollHeroVideoFile) {
        const formData = new FormData();
        formData.append("url", url);
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
        response = await fetch("/api/import-site", {
          method: "POST",
          body: formData,
        });
      } else {
        response = await fetch("/api/import-site", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            url,
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
        error?: string;
      };

      if (!response.ok || !data.siteSlug) {
        throw new Error(data.error ?? "Failed to import and build site.");
      }

      setResult({
        siteSlug: data.siteSlug,
        businessName: data.businessName ?? "Imported site",
      });
      setPhase("done");
    } catch (importError) {
      setPhase("error");
      setError(
        importError instanceof Error
          ? importError.message
          : "Failed to import and build site.",
      );
    } finally {
      window.clearTimeout(buildingTimer);
    }
  }

  const isLoading = phase === "extracting" || phase === "building";
  const loadingMessage =
    phase === "extracting"
      ? "Extracting site info..."
      : phase === "building"
        ? "Building your site..."
        : null;

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
      <Panel
        title="Import from URL"
        subtitle="Paste any business website URL. We'll extract the key details and generate a new WebMe site."
      >
        <form onSubmit={(event) => void handleSubmit(event)} className="space-y-4 px-5 py-5">
          <div>
            <label
              htmlFor="importSiteUrl"
              className="mb-2 block text-sm font-medium text-neutral-700"
            >
              Website URL
            </label>
            <input
              id="importSiteUrl"
              type="url"
              required
              value={url}
              onChange={(event) => setUrl(event.target.value)}
              placeholder="https://example-business.com"
              className={inputClassName}
              disabled={isLoading}
            />
          </div>

          <div className="flex flex-wrap items-end gap-4">
            <ScrollAnimationBuildOptions
              checked={scrollAnimationEffect}
              onCheckedChange={(checked) => {
                setScrollAnimationEffect(checked);
                if (!checked) {
                  setScrollHeroVideoFile(null);
                  setScrollHeroPresetId(null);
                  setScrollHeroSequencePresetId(null);
                  setScrollHeroMediaType("video");
                }
              }}
              cardHoverChecked={cardHoverEffect}
              onCardHoverCheckedChange={setCardHoverEffect}
              disabled={isLoading}
              scrollHeroMediaType={scrollHeroMediaType}
              onScrollHeroMediaTypeChange={setScrollHeroMediaType}
              videoFile={scrollHeroVideoFile}
              onVideoFileChange={(file) => {
                setScrollHeroVideoFile(file);
                if (file) {
                  setScrollHeroPresetId(null);
                }
              }}
              selectedPresetId={scrollHeroPresetId}
              onSelectedPresetIdChange={(presetId) => {
                setScrollHeroPresetId(presetId);
                if (presetId) {
                  setScrollHeroVideoFile(null);
                  setScrollHeroSequencePresetId(null);
                }
              }}
              selectedSequencePresetId={scrollHeroSequencePresetId}
              onSelectedSequencePresetIdChange={(sequenceId) => {
                setScrollHeroSequencePresetId(sequenceId);
                if (sequenceId) {
                  setScrollHeroPresetId(null);
                  setScrollHeroVideoFile(null);
                }
              }}
            />

            <button
              type="submit"
              disabled={isLoading || !url.trim()}
              className="rounded-lg bg-neutral-900 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-neutral-800 disabled:cursor-not-allowed disabled:opacity-60"
            >
              {isLoading ? "Working..." : "Extract & Build"}
            </button>
          </div>
        </form>

        {loadingMessage ? (
          <div className="border-t border-neutral-200 px-5 py-4">
            <div className="flex items-center gap-3 text-sm text-neutral-700">
              <span
                className="inline-block h-4 w-4 animate-spin rounded-full border-2 border-neutral-300 border-t-neutral-900"
                aria-hidden
              />
              <span>{loadingMessage}</span>
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
