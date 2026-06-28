"use client";

import {
  CheckoutErrorState,
  CheckoutLoadingState,
  CheckoutPageShell,
  CheckoutPanel,
  PrimaryLink,
  SecondaryLink,
  useCheckoutOnboarding,
} from "../_components/checkout-flow";

function DomainQuestionContent() {
  const { data, loading, error } = useCheckoutOnboarding();

  if (loading) {
    return <CheckoutLoadingState />;
  }

  if (error || !data) {
    return <CheckoutErrorState message={error ?? "Site not found."} />;
  }

  return (
    <CheckoutPanel
      title="Does your business have a domain name?"
      subtitle="We'll connect your custom domain so customers find you at yoursite.com — not a temporary link."
    >
      <div className="grid gap-3 sm:grid-cols-2">
        <PrimaryLink href="/checkout/existing-domain">Yes, I have a domain</PrimaryLink>
        <SecondaryLink href="/checkout/new-domain">No, I need one</SecondaryLink>
      </div>
    </CheckoutPanel>
  );
}

export default function CheckoutDomainPage() {
  return (
    <CheckoutPageShell>
      <DomainQuestionContent />
    </CheckoutPageShell>
  );
}
