"use client";

import {
  CheckoutErrorState,
  CheckoutLoadingState,
  CheckoutPageShell,
  CheckoutPanel,
  PrimaryLink,
  useCheckoutOnboarding,
} from "../_components/checkout-flow";

function SuccessContent() {
  const { data, loading, error } = useCheckoutOnboarding();

  if (loading) {
    return <CheckoutLoadingState />;
  }

  if (error || !data) {
    return <CheckoutErrorState message={error ?? "Site not found."} />;
  }

  return (
    <CheckoutPanel
      title="🎉 Your site is ready!"
      subtitle={`Thank you for choosing MyWebMe. ${data.businessName} is paid and being prepared for launch.`}
    >
      <div className="space-y-4">
        <div className="rounded-xl border border-neutral-200 bg-neutral-50 px-4 py-3">
          <p className="text-xs font-medium uppercase tracking-wide text-neutral-500">
            Business
          </p>
          <p className="mt-1 text-lg font-semibold text-neutral-900">
            {data.businessName}
          </p>
        </div>

        <a
          href={`/preview/${encodeURIComponent(data.siteSlug)}?mode=public`}
          target="_blank"
          rel="noopener noreferrer"
          className="block rounded-xl border border-neutral-200 px-4 py-3 text-sm font-medium text-neutral-900 underline-offset-2 hover:underline"
        >
          Preview your site →
        </a>

        <PrimaryLink href="/checkout/domain">Set Up Your Domain →</PrimaryLink>
      </div>
    </CheckoutPanel>
  );
}

export default function CheckoutSuccessPage() {
  return (
    <CheckoutPageShell>
      <SuccessContent />
    </CheckoutPageShell>
  );
}
