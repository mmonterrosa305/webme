"use client";

import { useState } from "react";

import type { LeadPreview } from "@/lib/leads/types";

type Modal = "packages" | "declined" | null;

type PlanId = "starter" | "premium";

const PACKAGES = [
  {
    id: "starter" as const,
    name: "Starter",
    setup: "$199",
    monthly: "$29/mo",
    features: [
      "Custom single-page site",
      "Mobile responsive",
      "Hosting & SSL included",
      "Email support",
    ],
  },
  {
    id: "premium" as const,
    name: "Premium",
    setup: "$599",
    monthly: "$59/mo",
    features: [
      "Everything in Starter",
      "Multi-page expansion",
      "Priority support",
      "Monthly content updates",
    ],
    highlighted: true,
  },
];

function ModalBackdrop({
  children,
  onClose,
}: {
  children: React.ReactNode;
  onClose: () => void;
}) {
  return (
    <div
      className="fixed inset-0 z-[100] flex items-center justify-center bg-black/60 p-4"
      role="dialog"
      aria-modal="true"
      onClick={onClose}
    >
      <div
        className="max-h-[90vh] w-full max-w-lg overflow-y-auto rounded-2xl bg-white shadow-2xl"
        onClick={(event) => event.stopPropagation()}
      >
        {children}
      </div>
    </div>
  );
}

export function PreviewShell({ lead }: { lead: LeadPreview }) {
  const [modal, setModal] = useState<Modal>(null);
  const [payingPlan, setPayingPlan] = useState<PlanId | null>(null);
  const [checkoutError, setCheckoutError] = useState<string | null>(null);

  async function handlePayNow(plan: PlanId) {
    setCheckoutError(null);
    setPayingPlan(plan);

    try {
      const response = await fetch("/api/stripe/checkout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ slug: lead.site_slug, plan }),
      });

      const data = (await response.json()) as { url?: string; error?: string };

      if (!response.ok || !data.url) {
        throw new Error(data.error ?? "Could not start checkout.");
      }

      window.location.href = data.url;
    } catch (error) {
      setCheckoutError(
        error instanceof Error ? error.message : "Checkout failed.",
      );
      setPayingPlan(null);
    }
  }

  return (
    <div className="flex h-dvh flex-col">
      <header className="sticky top-0 z-50 shrink-0 border-b border-neutral-800 bg-[#111111] px-4 py-3 shadow-lg sm:px-6">
        <div className="mx-auto flex max-w-7xl flex-wrap items-center justify-between gap-3">
          <div className="min-w-0">
            <p className="text-xs font-medium uppercase tracking-wider text-neutral-400">
              Preview for
            </p>
            <h1 className="truncate text-lg font-semibold text-white sm:text-xl">
              {lead.business_name}
            </h1>
          </div>
          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              onClick={() => setModal("packages")}
              className="rounded-lg bg-white px-4 py-2 text-sm font-semibold text-neutral-900 transition hover:bg-neutral-100"
            >
              Yes! I want this site
            </button>
            <button
              type="button"
              onClick={() => setModal("declined")}
              className="rounded-lg border border-neutral-600 px-4 py-2 text-sm font-medium text-white transition hover:border-neutral-400 hover:bg-neutral-800"
            >
              No thanks
            </button>
          </div>
        </div>
      </header>

      <iframe
        title={`Website preview for ${lead.business_name}`}
        srcDoc={lead.site_html}
        sandbox="allow-scripts allow-same-origin"
        className="min-h-0 w-full flex-1 border-0 bg-white"
      />

      {modal === "packages" ? (
        <ModalBackdrop onClose={() => setModal(null)}>
          <div className="p-6 sm:p-8">
            <h2 className="text-xl font-semibold text-neutral-900">
              Choose your package
            </h2>
            <p className="mt-1 text-sm text-neutral-600">
              Launch {lead.business_name} with WebMe — setup fee plus monthly
              hosting.
            </p>

            <div className="mt-6 space-y-4">
              {PACKAGES.map((pkg) => (
                <div
                  key={pkg.id}
                  className={`rounded-xl border p-5 ${
                    pkg.highlighted
                      ? "border-neutral-900 ring-2 ring-neutral-900"
                      : "border-neutral-200"
                  }`}
                >
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <h3 className="font-semibold text-neutral-900">
                        {pkg.name}
                      </h3>
                      <p className="mt-1 text-2xl font-bold text-neutral-900">
                        {pkg.setup}
                        <span className="text-base font-normal text-neutral-500">
                          {" "}
                          + {pkg.monthly}
                        </span>
                      </p>
                    </div>
                  </div>
                  <ul className="mt-3 space-y-1 text-sm text-neutral-600">
                    {pkg.features.map((feature) => (
                      <li key={feature}>• {feature}</li>
                    ))}
                  </ul>
                  <button
                    type="button"
                    onClick={() => handlePayNow(pkg.id)}
                    disabled={payingPlan !== null}
                    className="mt-4 w-full rounded-lg bg-neutral-900 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-neutral-800 disabled:cursor-not-allowed disabled:opacity-60"
                  >
                    {payingPlan === pkg.id ? "Redirecting…" : "Pay Now"}
                  </button>
                </div>
              ))}
            </div>

            {checkoutError ? (
              <p className="mt-4 text-sm text-red-600" role="alert">
                {checkoutError}
              </p>
            ) : null}

            <button
              type="button"
              onClick={() => setModal(null)}
              className="mt-6 w-full text-center text-sm text-neutral-500 hover:text-neutral-800"
            >
              Close
            </button>
          </div>
        </ModalBackdrop>
      ) : null}

      {modal === "declined" ? (
        <ModalBackdrop onClose={() => setModal(null)}>
          <div className="p-6 text-center sm:p-8">
            <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-neutral-100 text-xl">
              ✓
            </div>
            <h2 className="text-xl font-semibold text-neutral-900">
              No problem at all
            </h2>
            <p className="mt-3 text-sm leading-relaxed text-neutral-600">
              We&apos;ll keep your custom site for {lead.business_name} on file.
              If you change your mind, just reply to our email or reach out
              anytime — your preview link will still work.
            </p>
            <button
              type="button"
              onClick={() => setModal(null)}
              className="mt-6 rounded-lg bg-neutral-900 px-6 py-2.5 text-sm font-semibold text-white hover:bg-neutral-800"
            >
              Back to preview
            </button>
          </div>
        </ModalBackdrop>
      ) : null}
    </div>
  );
}
