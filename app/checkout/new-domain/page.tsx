"use client";

import { useMemo, useState } from "react";

import {
  buildNamecheapDomainSearchUrl,
  cleanBusinessNameForDomainSearch,
} from "@/lib/checkout/domain-search-name";

import {
  CheckoutErrorState,
  CheckoutInput,
  CheckoutLoadingState,
  CheckoutPageShell,
  CheckoutPanel,
  ExternalPrimaryLink,
  PrimaryButton,
  submitCheckoutDomain,
  useCheckoutOnboarding,
  useCheckoutRouter,
} from "../_components/checkout-flow";

function NewDomainContent() {
  const { slug, data, loading, error } = useCheckoutOnboarding();
  const router = useCheckoutRouter();
  const [domain, setDomain] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [searchedNamecheap, setSearchedNamecheap] = useState(false);

  const searchName = useMemo(
    () => cleanBusinessNameForDomainSearch(data?.businessName ?? ""),
    [data?.businessName],
  );
  const namecheapUrl = useMemo(
    () => buildNamecheapDomainSearchUrl(data?.businessName ?? "mybusiness"),
    [data?.businessName],
  );

  if (loading) {
    return <CheckoutLoadingState />;
  }

  if (error || !data) {
    return <CheckoutErrorState message={error ?? "Site not found."} />;
  }

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (!slug) {
      return;
    }

    setSubmitting(true);
    setSubmitError(null);

    try {
      await submitCheckoutDomain(slug, domain);
      router.push("/checkout/dns");
    } catch (submitErr) {
      setSubmitError(
        submitErr instanceof Error ? submitErr.message : "Failed to save domain.",
      );
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <CheckoutPanel title="Set up your domain">
      <div className="space-y-8">
        <section
          className={`rounded-xl border p-5 sm:p-6 ${
            searchedNamecheap
              ? "border-neutral-200 bg-neutral-50"
              : "border-neutral-900 bg-white shadow-sm ring-1 ring-neutral-900/5"
          }`}
        >
          <p className="text-xs font-semibold uppercase tracking-wide text-neutral-500">
            Step 1 of 2
          </p>
          <h2 className="mt-2 text-xl font-semibold text-neutral-900">
            Get a domain for your site
          </h2>
          <p className="mt-2 text-sm leading-relaxed text-neutral-600">
            We&apos;ll open Namecheap with a search for &ldquo;{searchName}&rdquo;
            based on {data.businessName}. Buy a domain you like, then come back
            here for step 2.
          </p>

          <div className="mt-5">
            <ExternalPrimaryLink
              href={namecheapUrl}
              target="_blank"
              rel="noopener noreferrer"
              onClick={() => setSearchedNamecheap(true)}
            >
              Search domains on Namecheap →
            </ExternalPrimaryLink>
          </div>

          <div className="mt-4 rounded-xl border border-amber-200 bg-amber-50 px-4 py-4 text-sm text-amber-950">
            <p className="font-semibold">
              Come back here after purchasing your domain
            </p>
            <p className="mt-1 text-amber-900/90">
              Keep this tab open (or return to this page). Once you own a domain,
              continue to step 2 below to connect it.
            </p>
          </div>
        </section>

        <div
          className="flex items-center gap-3 px-1"
          aria-hidden
        >
          <div className="h-px flex-1 bg-neutral-200" />
          <span className="text-xs font-medium uppercase tracking-wide text-neutral-400">
            Then
          </span>
          <div className="h-px flex-1 bg-neutral-200" />
        </div>

        <section
          className={`rounded-xl border p-5 transition-all sm:p-6 ${
            searchedNamecheap
              ? "border-neutral-900 bg-white shadow-sm ring-1 ring-neutral-900/5"
              : "border-dashed border-neutral-200 bg-neutral-50/80 opacity-60"
          }`}
          aria-disabled={!searchedNamecheap}
        >
          <p className="text-xs font-semibold uppercase tracking-wide text-neutral-500">
            Step 2 of 2
          </p>
          <h2 className="mt-2 text-xl font-semibold text-neutral-900">
            Connect your new domain
          </h2>
          <p className="mt-2 text-sm leading-relaxed text-neutral-600">
            {searchedNamecheap
              ? "Enter the domain you purchased and we'll start connecting it to your site."
              : "This step unlocks after you open Namecheap to search for a domain."}
          </p>

          {!searchedNamecheap ? (
            <p className="mt-4 text-sm font-medium text-neutral-500">
              Complete step 1 first — click &ldquo;Search domains on
              Namecheap&rdquo; above.
            </p>
          ) : (
            <form
              onSubmit={(event) => void handleSubmit(event)}
              className="mt-5 space-y-4"
            >
              <div>
                <label
                  htmlFor="newDomain"
                  className="mb-2 block text-sm font-medium text-neutral-700"
                >
                  Enter your new domain (e.g. {searchName}.com)
                </label>
                <CheckoutInput
                  id="newDomain"
                  value={domain}
                  onChange={setDomain}
                  placeholder={`${searchName}.com`}
                  disabled={submitting}
                />
              </div>

              {submitError ? (
                <p className="text-sm font-medium text-red-600" role="alert">
                  {submitError}
                </p>
              ) : null}

              <PrimaryButton
                type="submit"
                disabled={submitting || !domain.trim()}
              >
                {submitting ? "Saving…" : "Connect My Domain"}
              </PrimaryButton>
            </form>
          )}
        </section>
      </div>
    </CheckoutPanel>
  );
}

export default function CheckoutNewDomainPage() {
  return (
    <CheckoutPageShell>
      <NewDomainContent />
    </CheckoutPageShell>
  );
}
