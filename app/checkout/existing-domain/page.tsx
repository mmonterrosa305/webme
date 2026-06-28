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
      router.push("/checkout/confirmed");
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
      subtitle="Enter the domain you already own. We'll walk you through pointing DNS to WebMe."
    >
      <form onSubmit={(event) => void handleSubmit(event)} className="space-y-6">
        <div>
          <label
            htmlFor="domain"
            className="mb-2 block text-sm font-medium text-neutral-700"
          >
            Your domain
          </label>
          <CheckoutInput
            id="domain"
            value={domain}
            onChange={setDomain}
            placeholder="yoursite.com"
            disabled={submitting}
          />
        </div>

        <div className="rounded-xl border border-neutral-200 bg-neutral-50 px-4 py-4 text-sm text-neutral-700">
          <p className="font-semibold text-neutral-900">DNS setup instructions</p>
          <ol className="mt-3 list-decimal space-y-2 pl-5">
            <li>Sign in to your domain registrar (GoDaddy, Namecheap, etc.).</li>
            <li>
              Add a <strong>CNAME</strong> record for <code>www</code> pointing to{" "}
              <code>sites.mywebme.com</code>.
            </li>
            <li>
              Add an <strong>A record</strong> for <code>@</code> pointing to{" "}
              <code>76.76.21.21</code> (or follow the exact records we email you).
            </li>
            <li>DNS changes can take up to 24 hours to propagate worldwide.</li>
          </ol>
        </div>

        {submitError ? (
          <p className="text-sm font-medium text-red-600" role="alert">
            {submitError}
          </p>
        ) : null}

        <PrimaryButton type="submit" disabled={submitting || !domain.trim()}>
          {submitting ? "Saving…" : "My domain is ready"}
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
