"use client";

import Image from "next/image";
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
    logoSrc: "/registrars/godaddy.svg",
    logoWidth: 160,
    logoHeight: 33,
  },
  {
    name: "Namecheap",
    href: "https://www.namecheap.com/",
    logoSrc: "/registrars/namecheap.svg",
    logoWidth: 160,
    logoHeight: 89,
  },
  {
    name: "HostGator",
    href: "https://www.hostgator.com/",
    logoSrc: "/registrars/hostgator.svg",
    logoWidth: 160,
    logoHeight: 29,
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
      <div className="grid gap-4 sm:grid-cols-3">
        {REGISTRARS.map((registrar) => (
          <a
            key={registrar.name}
            href={registrar.href}
            target="_blank"
            rel="noopener noreferrer"
            className="group flex flex-col items-center rounded-2xl border border-neutral-200 bg-white px-6 py-8 text-center shadow-sm transition duration-200 hover:-translate-y-0.5 hover:border-neutral-300 hover:shadow-md"
          >
            <div className="flex h-20 w-full items-center justify-center">
              <Image
                src={registrar.logoSrc}
                alt={`${registrar.name} logo`}
                width={registrar.logoWidth}
                height={registrar.logoHeight}
                className="h-auto max-h-16 w-auto max-w-[160px] object-contain transition duration-200 group-hover:scale-[1.02]"
              />
            </div>
            <span className="mt-5 text-sm font-semibold text-neutral-900">
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
