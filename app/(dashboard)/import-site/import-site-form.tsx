"use client";

import Link from "next/link";
import { useState } from "react";

import { Panel } from "../_components/dashboard-ui";

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

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    setResult(null);
    setPhase("extracting");

    const buildingTimer = window.setTimeout(() => {
      setPhase((current) => (current === "extracting" ? "building" : current));
    }, 2500);

    try {
      const response = await fetch("/api/import-site", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ url }),
      });

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

          <button
            type="submit"
            disabled={isLoading || !url.trim()}
            className="rounded-lg bg-neutral-900 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-neutral-800 disabled:cursor-not-allowed disabled:opacity-60"
          >
            {isLoading ? "Working..." : "Extract & Build"}
          </button>
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
            <Link
              href={`/preview/${result.siteSlug}`}
              target="_blank"
              rel="noopener noreferrer"
              className="mt-3 inline-flex rounded-lg bg-neutral-900 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-neutral-800"
            >
              See Site
            </Link>
          </div>
        ) : null}
      </Panel>
    </div>
  );
}
