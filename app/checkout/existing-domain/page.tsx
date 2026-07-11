"use client";

import { useState } from "react";

import {
  CheckoutErrorState,
  CheckoutInput,
  CheckoutLoadingState,
  CheckoutPageShell,
  CheckoutPanel,
  PrimaryButton,
  submitCheckoutDomain,
  useCheckoutOnboarding,
  useCheckoutRouter,
} from "../_components/checkout-flow";

function ExistingDomainContent() {
  const { slug, data, loading, error } = useCheckoutOnboarding();
  const router = useCheckoutRouter();
  const [domain, setDomain] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);

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
      title="Connect your existing domain"
      subtitle="Enter the domain you already own. Next we'll show you the exact DNS records to add."
    >
      <form onSubmit={(event) => void handleSubmit(event)} className="space-y-6">
        <div>
          <label
            htmlFor="domain"
            className="mb-2 block text-sm font-medium text-neutral-700"
          >
            Enter your domain (e.g. yourbusiness.com)
          </label>
          <CheckoutInput
            id="domain"
            value={domain}
            onChange={setDomain}
            placeholder="yourbusiness.com"
            disabled={submitting}
          />
        </div>

        {submitError ? (
          <p className="text-sm font-medium text-red-600" role="alert">
            {submitError}
          </p>
        ) : null}

        <PrimaryButton type="submit" disabled={submitting || !domain.trim()}>
          {submitting ? "Saving…" : "Continue to DNS setup"}
        </PrimaryButton>
      </form>
    </CheckoutPanel>
  );
}

export default function CheckoutExistingDomainPage() {
  return (
    <CheckoutPageShell>
      <ExistingDomainContent />
    </CheckoutPageShell>
  );
}
