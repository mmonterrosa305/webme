"use client";

import { useEffect, useRef, useState } from "react";

import {
  CheckoutErrorState,
  CheckoutLoadingState,
  CheckoutPageShell,
  CheckoutPanel,
  ExternalPrimaryLink,
  sendCheckoutWelcome,
  useCheckoutOnboarding,
} from "../_components/checkout-flow";

function ConfirmedContent() {
  const { slug, data, loading, error } = useCheckoutOnboarding();
  const [welcomeStatus, setWelcomeStatus] = useState<
    "idle" | "sending" | "sent" | "failed"
  >("idle");
  const welcomeSentRef = useRef(false);

  useEffect(() => {
    if (!slug || !data?.ownerEmail || welcomeSentRef.current) {
      return;
    }

    welcomeSentRef.current = true;
    setWelcomeStatus("sending");

    void sendCheckoutWelcome(slug)
      .then(() => setWelcomeStatus("sent"))
      .catch(() => setWelcomeStatus("failed"));
  }, [slug, data?.ownerEmail]);

  if (loading) {
    return <CheckoutLoadingState />;
  }

  if (error || !data) {
    return <CheckoutErrorState message={error ?? "Site not found."} />;
  }

  return (
    <CheckoutPanel
      title="You're all set!"
      subtitle={
        data.domainStatus === "active"
          ? "Thanks for updating your DNS. We're finishing the connection — your custom domain should go live within 24–48 hours."
          : "Your site will be live within 24 hours. We received your domain details and our team is connecting everything."
      }
    >
      <div className="space-y-4">
        {data.domainRequested ? (
          <div className="rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-900">
            Domain on file:{" "}
            <span className="font-semibold">{data.domainRequested}</span>
          </div>
        ) : null}

        {welcomeStatus === "sending" ? (
          <p className="text-sm text-neutral-600">Sending your welcome email…</p>
        ) : null}

        {welcomeStatus === "sent" ? (
          <p className="text-sm text-emerald-700" role="status">
            Welcome email sent{data.ownerEmail ? ` to ${data.ownerEmail}` : ""}{" "}
            with a link to view your site.
          </p>
        ) : null}

        {welcomeStatus === "failed" ? (
          <p className="text-sm text-amber-800" role="alert">
            We couldn&apos;t send the welcome email automatically. You can still
            sign in at the client portal — request a code with your email.
          </p>
        ) : null}

        <ExternalPrimaryLink href={data.portalUrl}>
          Go to client portal →
        </ExternalPrimaryLink>

        <a
          href={data.previewUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="block text-center text-sm font-medium text-neutral-600 underline-offset-2 hover:text-neutral-900 hover:underline"
        >
          Preview {data.businessName}
        </a>
      </div>
    </CheckoutPanel>
  );
}

export default function CheckoutConfirmedPage() {
  return (
    <CheckoutPageShell>
      <ConfirmedContent />
    </CheckoutPageShell>
  );
}
