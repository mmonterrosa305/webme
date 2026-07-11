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
    <CheckoutPanel
      title="Get a domain for your site"
      subtitle={`We'll open Namecheap with a search for “${searchName}” based on ${data.businessName}. Buy a domain you like, then come back here to connect it.`}
    >
      <div className="space-y-6">
        <ExternalPrimaryLink
          href={namecheapUrl}
          target="_blank"
          rel="noopener noreferrer"
        >
          Search domains on Namecheap →
        </ExternalPrimaryLink>

        <div className="rounded-xl border border-amber-200 bg-amber-50 px-4 py-4 text-sm text-amber-950">
          <p className="font-semibold">Come back here after purchasing your domain</p>
          <p className="mt-1 text-amber-900/90">
            Keep this tab open (or return to this page). Once you own a domain,
            enter it below so we can connect it to your site.
          </p>
        </div>

        <form
          onSubmit={(event) => void handleSubmit(event)}
          className="space-y-4"
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

          <PrimaryButton type="submit" disabled={submitting || !domain.trim()}>
            {submitting ? "Saving…" : "Connect My Domain"}
          </PrimaryButton>
        </form>
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
