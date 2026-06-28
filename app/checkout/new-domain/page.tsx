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

const REGISTRARS = [
  {
    name: "GoDaddy",
    href: "https://www.godaddy.com/",
    initials: "GD",
    color: "bg-emerald-600",
  },
  {
    name: "Namecheap",
    href: "https://www.namecheap.com/",
    initials: "NC",
    color: "bg-orange-500",
  },
  {
    name: "HostGator",
    href: "https://www.hostgator.com/",
    initials: "HG",
    color: "bg-blue-600",
  },
] as const;

function NewDomainContent() {
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
      title="Choose a domain registrar"
      subtitle="Purchase your domain at any registrar below. Affiliate links coming soon — these open the registrar homepage for now."
    >
      <div className="grid gap-3 sm:grid-cols-3">
        {REGISTRARS.map((registrar) => (
          <a
            key={registrar.name}
            href={registrar.href}
            target="_blank"
            rel="noopener noreferrer"
            className="flex flex-col items-center rounded-xl border border-neutral-200 bg-white p-4 text-center transition hover:border-neutral-900 hover:shadow-sm"
          >
            <span
              className={`flex h-12 w-12 items-center justify-center rounded-full text-sm font-bold text-white ${registrar.color}`}
            >
              {registrar.initials}
            </span>
            <span className="mt-3 text-sm font-semibold text-neutral-900">
              {registrar.name}
            </span>
          </a>
        ))}
      </div>

      <p className="mt-8 text-sm text-neutral-600">
        Once you&apos;ve purchased your domain, come back and enter it here:
      </p>

      <form
        onSubmit={(event) => void handleSubmit(event)}
        className="mt-4 space-y-4"
      >
        <CheckoutInput
          id="newDomain"
          value={domain}
          onChange={setDomain}
          placeholder="yourbusiness.com"
          disabled={submitting}
        />

        {submitError ? (
          <p className="text-sm font-medium text-red-600" role="alert">
            {submitError}
          </p>
        ) : null}

        <PrimaryButton type="submit" disabled={submitting || !domain.trim()}>
          {submitting ? "Saving…" : "Continue"}
        </PrimaryButton>
      </form>
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
