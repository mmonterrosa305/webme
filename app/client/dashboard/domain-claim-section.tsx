"use client";

import { useState } from "react";

import { getDomainPriceLimit } from "@/lib/domains/constants";

type DomainResult = {
  domain: string;
  tld: string;
  available: boolean;
  pricePerYear: number | null;
  currency: string;
  isSuggestion?: boolean;
};

type DomainClaimSectionProps = {
  plan: string;
  domainRequested: string | null;
  domainStatus: string | null;
};

const SEARCH_BAR_STYLE = {
  width: "300px",
  maxWidth: "100%",
  minWidth: 0,
} as const;
const RESULTS_CARD =
  "mx-auto w-full max-w-[700px] rounded-lg border border-neutral-200 bg-white px-5 py-4 shadow-sm";

function formatPrice(price: number | null): string | null {
  if (price === null) {
    return null;
  }

  return `$${Math.round(price)}/yr`;
}

function EliteUpsellCard({
  domain,
  pricePerYear,
  upgrading,
  upgradeError,
  onUpgrade,
}: {
  domain: string;
  pricePerYear: number;
  upgrading: boolean;
  upgradeError: string | null;
  onUpgrade: () => void;
}) {
  const priceLabel = formatPrice(pricePerYear);

  return (
    <li
      className={`${RESULTS_CARD} border-l-4 border-l-amber-400 pl-3.5 text-center`}
    >
      <p className="text-[1.75rem] font-bold leading-tight text-neutral-900">
        {domain}
        {priceLabel ? (
          <span className="font-normal text-neutral-500"> · {priceLabel}</span>
        ) : null}
      </p>
      <p className="mt-1.5 text-2xl leading-tight text-neutral-600">
        Available on Elite plan
      </p>
      {upgradeError ? (
        <p className="mt-2 text-[1.75rem] leading-tight text-red-600" role="alert">
          {upgradeError}
        </p>
      ) : null}
      <button
        type="button"
        disabled={upgrading}
        onClick={onUpgrade}
        className="mx-auto mt-3 inline-flex rounded-full bg-neutral-900 px-5 py-2.5 text-2xl font-semibold text-white transition hover:bg-neutral-800 disabled:cursor-not-allowed disabled:opacity-50"
      >
        {upgrading ? "Redirecting…" : "Upgrade to Elite"}
      </button>
    </li>
  );
}

function DomainResultRow({
  result,
  plan,
  priceLimit,
  claimingDomain,
  upgrading,
  upgradeError,
  onClaim,
  onUpgrade,
}: {
  result: DomainResult;
  plan: string;
  priceLimit: number;
  claimingDomain: string | null;
  upgrading: boolean;
  upgradeError: string | null;
  onClaim: (result: DomainResult) => void;
  onUpgrade: () => void;
}) {
  const priceLabel = formatPrice(result.pricePerYear);
  const overPlanLimit =
    result.pricePerYear !== null && result.pricePerYear > priceLimit;
  const canClaim =
    result.available &&
    result.pricePerYear !== null &&
    !overPlanLimit &&
    claimingDomain === null;

  if (result.available && overPlanLimit && plan === "starter") {
    return (
      <EliteUpsellCard
        domain={result.domain}
        pricePerYear={result.pricePerYear!}
        upgrading={upgrading}
        upgradeError={upgradeError}
        onUpgrade={onUpgrade}
      />
    );
  }

  return (
    <li
      className={`${RESULTS_CARD} ${result.available ? "" : "opacity-60"}`}
    >
      <div className="flex min-w-0 flex-wrap items-center justify-center gap-x-4 gap-y-2 text-center">
        <span
          className={`shrink-0 text-[1.75rem] font-bold leading-tight ${
            result.available ? "text-neutral-900" : "text-neutral-400"
          }`}
        >
          {result.domain}
        </span>

        {priceLabel ? (
          <span className="shrink-0 text-[1.75rem] leading-tight text-neutral-500">
            {priceLabel}
          </span>
        ) : null}

        <span
          className={`shrink-0 rounded-full px-3 py-1 text-2xl font-medium leading-tight ${
            result.available
              ? "bg-green-50 text-green-700"
              : "bg-neutral-100 text-neutral-500"
          }`}
        >
          {result.available ? "Available" : "Taken"}
        </span>

        {result.available ? (
          <span className="shrink-0">
            {overPlanLimit ? (
              <a
                href="mailto:sites@mywebme.com?subject=Domain%20claim%20request"
                className="inline-flex rounded-full border border-neutral-300 bg-white px-4 py-2 text-2xl font-medium text-neutral-700 transition hover:bg-neutral-50"
              >
                Contact
              </a>
            ) : (
              <button
                type="button"
                disabled={!canClaim}
                onClick={() => onClaim(result)}
                className="inline-flex rounded-full bg-neutral-900 px-5 py-2.5 text-2xl font-semibold text-white transition hover:bg-neutral-800 disabled:cursor-not-allowed disabled:opacity-50"
              >
                {claimingDomain === result.domain ? "…" : "Claim it"}
              </button>
            )}
          </span>
        ) : null}
      </div>
    </li>
  );
}

function ResultList({
  items,
  plan,
  priceLimit,
  claimingDomain,
  upgrading,
  upgradeError,
  onClaim,
  onUpgrade,
}: {
  items: DomainResult[];
  plan: string;
  priceLimit: number;
  claimingDomain: string | null;
  upgrading: boolean;
  upgradeError: string | null;
  onClaim: (result: DomainResult) => void;
  onUpgrade: () => void;
}) {
  return (
    <ul className="mx-auto flex w-full max-w-[700px] flex-col items-center gap-4">
      {items.map((result) => (
        <DomainResultRow
          key={result.domain}
          result={result}
          plan={plan}
          priceLimit={priceLimit}
          claimingDomain={claimingDomain}
          upgrading={upgrading}
          upgradeError={upgradeError}
          onClaim={onClaim}
          onUpgrade={onUpgrade}
        />
      ))}
    </ul>
  );
}

export function DomainClaimSection({
  plan,
  domainRequested,
  domainStatus,
}: DomainClaimSectionProps) {
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<DomainResult[]>([]);
  const [suggestions, setSuggestions] = useState<DomainResult[]>([]);
  const [searching, setSearching] = useState(false);
  const [searchError, setSearchError] = useState<string | null>(null);
  const [claimingDomain, setClaimingDomain] = useState<string | null>(null);
  const [upgrading, setUpgrading] = useState(false);
  const [upgradeError, setUpgradeError] = useState<string | null>(null);
  const [claimError, setClaimError] = useState<string | null>(null);
  const [submittedDomain, setSubmittedDomain] = useState(domainRequested);
  const [submittedStatus, setSubmittedStatus] = useState(domainStatus);

  const priceLimit = getDomainPriceLimit(plan);

  async function handleSearch() {
    const trimmed = query.trim();

    if (trimmed.length < 2) {
      setSearchError("Enter at least 2 characters to search.");
      setResults([]);
      setSuggestions([]);
      return;
    }

    setSearching(true);
    setSearchError(null);
    setClaimError(null);

    try {
      const response = await fetch("/api/client/domains/check", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ query: trimmed }),
      });

      const data = (await response.json()) as {
        results?: DomainResult[];
        suggestions?: DomainResult[];
        error?: string;
      };

      if (!response.ok) {
        throw new Error(data.error ?? "Failed to check domains.");
      }

      setResults(data.results ?? []);
      setSuggestions(data.suggestions ?? []);
    } catch (error) {
      setResults([]);
      setSuggestions([]);
      setSearchError(
        error instanceof Error ? error.message : "Failed to check domains.",
      );
    } finally {
      setSearching(false);
    }
  }

  async function handleUpgradeToElite() {
    setUpgrading(true);
    setUpgradeError(null);

    try {
      const response = await fetch("/api/stripe/upgrade-checkout", {
        method: "POST",
      });

      const data = (await response.json()) as { url?: string; error?: string };

      if (!response.ok || !data.url) {
        throw new Error(data.error ?? "Could not start checkout.");
      }

      window.location.href = data.url;
    } catch (error) {
      setUpgradeError(
        error instanceof Error ? error.message : "Checkout failed.",
      );
      setUpgrading(false);
    }
  }

  async function handleClaim(result: DomainResult) {
    if (!result.available || result.pricePerYear === null) {
      return;
    }

    setClaimingDomain(result.domain);
    setClaimError(null);

    try {
      const response = await fetch("/api/client/domains/claim", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          domain: result.domain,
          pricePerYear: result.pricePerYear,
        }),
      });

      const data = (await response.json()) as {
        message?: string;
        domain?: string;
        error?: string;
      };

      if (!response.ok) {
        throw new Error(data.error ?? "Failed to submit domain request.");
      }

      setSubmittedDomain(data.domain ?? result.domain);
      setSubmittedStatus("pending");
      setResults([]);
      setSuggestions([]);
      setQuery("");
    } catch (error) {
      setClaimError(
        error instanceof Error ? error.message : "Failed to submit domain request.",
      );
    } finally {
      setClaimingDomain(null);
    }
  }

  if (submittedStatus === "pending" && submittedDomain) {
    return (
      <section className="w-full bg-white px-8 py-10 text-center">
        <p className="text-[1.75rem] leading-tight text-green-700">
          Domain request submitted for{" "}
          <span className="font-semibold text-neutral-900">{submittedDomain}</span>.
          We&apos;ll have it live within 24 hours.
        </p>
      </section>
    );
  }

  return (
    <section className="flex w-full flex-col items-center bg-white px-8 py-10">
      <form
        style={SEARCH_BAR_STYLE}
        className="mx-auto flex items-center overflow-hidden rounded-full border border-neutral-300 bg-white pl-4 pr-1 shadow-sm transition focus-within:border-neutral-400 focus-within:ring-2 focus-within:ring-neutral-200/80"
        onSubmit={(event) => {
          event.preventDefault();
          void handleSearch();
        }}
      >
        <input
          id="domainSearch"
          value={query}
          onChange={(event) => setQuery(event.target.value)}
          placeholder="Type the domain you want"
          className="min-w-0 flex-1 border-0 bg-transparent py-2.5 text-[1.75rem] leading-tight text-neutral-900 outline-none placeholder:text-neutral-400"
        />
        <button
          type="submit"
          disabled={searching}
          className="shrink-0 rounded-full bg-neutral-900 px-4 py-2.5 text-2xl font-semibold text-white transition hover:bg-neutral-800 disabled:cursor-not-allowed disabled:opacity-50"
        >
          {searching ? "…" : "Search →"}
        </button>
      </form>

      {searchError ? (
        <p
          className="mx-auto mt-3 max-w-[700px] text-center text-[1.75rem] leading-tight text-red-600"
          role="alert"
        >
          {searchError}
        </p>
      ) : null}

      {claimError ? (
        <p
          className="mx-auto mt-3 max-w-[700px] text-center text-[1.75rem] leading-tight text-red-600"
          role="alert"
        >
          {claimError}
        </p>
      ) : null}

      {results.length > 0 || suggestions.length > 0 ? (
        <div
          className="mt-8 box-border flex w-full flex-col items-center py-4 pl-[190px] max-lg:pl-4"
        >
          {results.length > 0 ? (
            <ResultList
              items={results}
              plan={plan}
              priceLimit={priceLimit}
              claimingDomain={claimingDomain}
              upgrading={upgrading}
              upgradeError={upgradeError}
              onClaim={(item) => void handleClaim(item)}
              onUpgrade={() => void handleUpgradeToElite()}
            />
          ) : null}

          {suggestions.length > 0 ? (
            <div
              className={`flex w-full flex-col items-center ${results.length > 0 ? "mt-8" : ""}`}
            >
              <p className="mb-4 text-center text-2xl font-medium uppercase tracking-wide text-neutral-400">
                Alternatives
              </p>
              <ResultList
                items={suggestions}
                plan={plan}
                priceLimit={priceLimit}
                claimingDomain={claimingDomain}
                upgrading={upgrading}
                upgradeError={upgradeError}
                onClaim={(item) => void handleClaim(item)}
                onUpgrade={() => void handleUpgradeToElite()}
              />
            </div>
          ) : null}
        </div>
      ) : null}
    </section>
  );
}
