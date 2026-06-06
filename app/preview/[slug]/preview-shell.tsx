"use client";

import { useCallback, useEffect, useRef, useState } from "react";

import type { LeadPreview } from "@/lib/leads/types";
import { PREVIEW_FREE_EDITS } from "@/lib/plans/edit-limits";

type Modal = "packages" | "declined" | "edits-exhausted" | null;

type PlanId = "starter" | "monthly" | "premium";

type PreviewFields = {
  businessName: string;
  phone: string;
  tagline: string;
};

const PACKAGES = [
  {
    id: "monthly" as const,
    name: "Basic",
    setup: "$0 setup",
    monthly: "$99/mo",
    features: [
      "Site on webme subdomain",
      "1 page · 1 edit per month",
      "Cancel anytime",
      "First month free",
    ],
  },
  {
    id: "starter" as const,
    name: "Pro",
    setup: "$199",
    monthly: "$29/mo",
    features: [
      "You own the website",
      "Custom domain included",
      "Unlimited editing",
      "Photo & logo uploads",
      "First month free",
    ],
    highlighted: true,
    badge: "Most popular",
  },
  {
    id: "premium" as const,
    name: "Elite",
    setup: "$599",
    monthly: "$59/mo",
    features: [
      "Everything in Pro",
      "Up to 6 pages",
      "SEO + e-commerce ready",
      "Domain checker included",
      "First month free",
    ],
  },
];

const inputClassName =
  "w-full rounded-lg border border-neutral-300 bg-white px-3 py-2 text-sm text-neutral-900 outline-none focus:border-neutral-900 focus:ring-2 focus:ring-neutral-200";

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
        className="max-h-[90vh] w-full max-w-3xl overflow-y-auto rounded-2xl bg-white shadow-2xl"
        onClick={(event) => event.stopPropagation()}
      >
        {children}
      </div>
    </div>
  );
}

export function PreviewShell({
  lead,
  leadB = null,
}: {
  lead: LeadPreview;
  leadB?: LeadPreview | null;
}) {
  const pricingRef = useRef<HTMLElement>(null);
  const [chosenLead, setChosenLead] = useState<LeadPreview | null>(
    leadB ? null : lead,
  );
  const activeLead = chosenLead ?? lead;
  const showComparison = Boolean(leadB) && chosenLead === null;
  const [modal, setModal] = useState<Modal>(null);
  const [payingPlan, setPayingPlan] = useState<PlanId | null>(null);
  const [checkoutError, setCheckoutError] = useState<string | null>(null);
  const [siteHtml, setSiteHtml] = useState(lead.site_html);
  const [fields, setFields] = useState<PreviewFields>({
    businessName: lead.business_name,
    phone: "",
    tagline: "",
  });
  const [savedFields, setSavedFields] = useState<PreviewFields | null>(null);
  const [editsRemaining, setEditsRemaining] = useState(PREVIEW_FREE_EDITS);
  const [editsLimit, setEditsLimit] = useState(PREVIEW_FREE_EDITS);
  const [loadingEdits, setLoadingEdits] = useState(true);
  const [saving, setSaving] = useState(false);
  const [editError, setEditError] = useState<string | null>(null);

  const loadEditStatus = useCallback(async () => {
    try {
      const response = await fetch(`/api/preview/${activeLead.site_slug}/edits`);
      const data = (await response.json()) as {
        fields?: PreviewFields;
        editsRemaining?: number;
        editsLimit?: number;
        siteHtml?: string;
        error?: string;
      };

      if (!response.ok) {
        throw new Error(data.error ?? "Failed to load preview edits.");
      }

      if (data.fields) {
        setFields(data.fields);
        setSavedFields(data.fields);
      }

      if (data.siteHtml) {
        setSiteHtml(data.siteHtml);
      }

      setEditsRemaining(data.editsRemaining ?? PREVIEW_FREE_EDITS);
      setEditsLimit(data.editsLimit ?? PREVIEW_FREE_EDITS);
    } catch (error) {
      setEditError(
        error instanceof Error ? error.message : "Failed to load preview edits.",
      );
    } finally {
      setLoadingEdits(false);
    }
  }, [activeLead.site_slug]);

  useEffect(() => {
    if (showComparison) {
      return;
    }

    void loadEditStatus();
  }, [loadEditStatus, showComparison]);

  const hasFieldChanges =
    savedFields !== null &&
    (fields.businessName !== savedFields.businessName ||
      fields.phone !== savedFields.phone ||
      fields.tagline !== savedFields.tagline);

  async function handlePayNow(plan: PlanId) {
    setCheckoutError(null);
    setPayingPlan(plan);

    try {
      const response = await fetch("/api/stripe/checkout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ slug: activeLead.site_slug, plan }),
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

  async function handleSaveEdit() {
    if (editsRemaining <= 0) {
      setModal("edits-exhausted");
      return;
    }

    if (!hasFieldChanges) {
      return;
    }

    setSaving(true);
    setEditError(null);

    try {
      const response = await fetch(`/api/preview/${activeLead.site_slug}/edits`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(fields),
      });

      const data = (await response.json()) as {
        html?: string;
        fields?: PreviewFields;
        editsRemaining?: number;
        error?: string;
      };

      if (!response.ok) {
        if (response.status === 403) {
          setEditsRemaining(0);
          setModal("edits-exhausted");
          return;
        }

        throw new Error(data.error ?? "Failed to save edit.");
      }

      if (data.html) {
        setSiteHtml(data.html);
      }

      if (data.fields) {
        setFields(data.fields);
        setSavedFields(data.fields);
      }

      const remaining = data.editsRemaining ?? 0;
      setEditsRemaining(remaining);

      if (remaining <= 0) {
        setModal("edits-exhausted");
      }
    } catch (error) {
      setEditError(
        error instanceof Error ? error.message : "Failed to save edit.",
      );
    } finally {
      setSaving(false);
    }
  }

  function handleClaimSite() {
    setModal(null);
    pricingRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
  }

  return (
    <div className="flex min-h-dvh flex-col bg-neutral-100">
      <header className="sticky top-0 z-50 shrink-0 border-b border-neutral-800 bg-[#111111] px-4 py-3 shadow-lg sm:px-6">
        <div className="mx-auto flex max-w-7xl flex-wrap items-center justify-between gap-3">
          <div className="min-w-0">
            <p className="text-xs font-medium uppercase tracking-wider text-neutral-400">
              Preview for
            </p>
            <h1 className="truncate text-lg font-semibold text-white sm:text-xl">
              {fields.businessName || lead.business_name}
            </h1>
          </div>
          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              onClick={() => {
                setModal("packages");
                pricingRef.current?.scrollIntoView({
                  behavior: "smooth",
                  block: "start",
                });
              }}
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

      {showComparison && leadB ? (
        <div className="grid min-h-[55vh] flex-1 grid-cols-2">
          <div className="flex min-h-[55vh] flex-col bg-white">
            <p className="shrink-0 border-b border-neutral-200 px-4 py-2 text-sm font-semibold text-neutral-900">
              Option A
            </p>
            <iframe
              title={`Website preview option A for ${lead.business_name}`}
              srcDoc={lead.site_html}
              sandbox="allow-scripts allow-same-origin"
              className="min-h-0 w-full flex-1 border-0 bg-white"
            />
            <div className="shrink-0 border-t border-neutral-200 p-4">
              <button
                type="button"
                onClick={() => {
                  setChosenLead(lead);
                  setSiteHtml(lead.site_html);
                }}
                className="rounded-lg bg-neutral-900 px-4 py-2 text-sm font-semibold text-white transition hover:bg-neutral-800"
              >
                Choose This One
              </button>
            </div>
          </div>
          <div className="flex min-h-[55vh] flex-col bg-white">
            <p className="shrink-0 border-b border-neutral-200 px-4 py-2 text-sm font-semibold text-neutral-900">
              Option B
            </p>
            <iframe
              title={`Website preview option B for ${leadB.business_name}`}
              srcDoc={leadB.site_html}
              sandbox="allow-scripts allow-same-origin"
              className="min-h-0 w-full flex-1 border-0 bg-white"
            />
            <div className="shrink-0 border-t border-neutral-200 p-4">
              <button
                type="button"
                onClick={() => {
                  setChosenLead(leadB);
                  setSiteHtml(leadB.site_html);
                }}
                className="rounded-lg bg-neutral-900 px-4 py-2 text-sm font-semibold text-white transition hover:bg-neutral-800"
              >
                Choose This One
              </button>
            </div>
          </div>
        </div>
      ) : (
        <iframe
          title={`Website preview for ${activeLead.business_name}`}
          srcDoc={siteHtml}
          sandbox="allow-scripts allow-same-origin"
          className="min-h-[55vh] w-full flex-1 border-0 bg-white"
        />
      )}

      {!showComparison && editsRemaining > 0 ? (
        <div className="shrink-0 border-t border-neutral-200 bg-white px-4 py-4 shadow-[0_-4px_20px_rgba(0,0,0,0.06)] sm:px-6">
          <div className="mx-auto max-w-4xl">
            <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
              <p className="text-sm font-semibold text-neutral-900">
                Try free edits
              </p>
              <p className="text-sm text-neutral-600">
                {editsRemaining} of {editsLimit} free edits remaining
              </p>
            </div>

            <div className="grid gap-3 sm:grid-cols-3">
              <div>
                <label
                  htmlFor="previewBusinessName"
                  className="mb-1 block text-xs font-medium text-neutral-700"
                >
                  Business name
                </label>
                <input
                  id="previewBusinessName"
                  value={fields.businessName}
                  disabled={loadingEdits || saving}
                  onChange={(event) =>
                    setFields((current) => ({
                      ...current,
                      businessName: event.target.value,
                    }))
                  }
                  className={inputClassName}
                />
              </div>
              <div>
                <label
                  htmlFor="previewPhone"
                  className="mb-1 block text-xs font-medium text-neutral-700"
                >
                  Phone number
                </label>
                <input
                  id="previewPhone"
                  value={fields.phone}
                  disabled={loadingEdits || saving}
                  onChange={(event) =>
                    setFields((current) => ({
                      ...current,
                      phone: event.target.value,
                    }))
                  }
                  className={inputClassName}
                />
              </div>
              <div>
                <label
                  htmlFor="previewTagline"
                  className="mb-1 block text-xs font-medium text-neutral-700"
                >
                  Tagline
                </label>
                <input
                  id="previewTagline"
                  value={fields.tagline}
                  disabled={loadingEdits || saving}
                  onChange={(event) =>
                    setFields((current) => ({
                      ...current,
                      tagline: event.target.value,
                    }))
                  }
                  className={inputClassName}
                />
              </div>
            </div>

            <div className="mt-3 flex flex-wrap items-center gap-3">
              <button
                type="button"
                onClick={() => void handleSaveEdit()}
                disabled={loadingEdits || saving || !hasFieldChanges}
                className="rounded-lg bg-neutral-900 px-4 py-2 text-sm font-semibold text-white transition hover:bg-neutral-800 disabled:cursor-not-allowed disabled:opacity-50"
              >
                {saving ? "Saving…" : "Apply edit"}
              </button>
              {editError ? (
                <p className="text-sm text-red-600" role="alert">
                  {editError}
                </p>
              ) : null}
            </div>
          </div>
        </div>
      ) : null}

      {!showComparison ? (
      <section
        id="pricing"
        ref={pricingRef}
        className="shrink-0 border-t border-neutral-200 bg-white px-4 py-10 sm:px-6"
      >
        <div className="mx-auto max-w-5xl">
          <h2 className="text-center text-2xl font-semibold text-neutral-900">
            Claim your site
          </h2>
          <p className="mt-2 text-center text-sm text-neutral-600">
            Choose a plan to launch {fields.businessName || activeLead.business_name}{" "}
            — setup fee plus monthly hosting.
          </p>

          <div className="mt-8 grid gap-4 md:grid-cols-3">
            {PACKAGES.map((pkg) => (
              <div
                key={pkg.id}
                className={`rounded-xl border p-5 ${
                  pkg.highlighted
                    ? "border-neutral-900 ring-2 ring-neutral-900"
                    : "border-neutral-200"
                }`}
              >
                <div className="mb-2 min-h-6">
                  {"badge" in pkg && pkg.badge ? (
                    <span className="inline-flex rounded-full bg-neutral-900 px-2.5 py-1 text-xs font-semibold text-white">
                      {pkg.badge}
                    </span>
                  ) : null}
                </div>
                <h3 className="font-semibold text-neutral-900">{pkg.name}</h3>
                <p className="mt-1 text-2xl font-bold text-neutral-900">
                  {pkg.setup}
                  <span className="text-base font-normal text-neutral-500">
                    {" "}
                    + {pkg.monthly}
                  </span>
                </p>
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
            <p className="mt-4 text-center text-sm text-red-600" role="alert">
              {checkoutError}
            </p>
          ) : null}
        </div>
      </section>
      ) : null}

      {modal === "packages" ? (
        <ModalBackdrop onClose={() => setModal(null)}>
          <div className="p-6 sm:p-8">
            <h2 className="text-xl font-semibold text-neutral-900">
              Choose your package
            </h2>
            <p className="mt-1 text-sm text-neutral-600">
              Launch {fields.businessName || lead.business_name} with WebMe.
            </p>

            <div className="mt-6 grid gap-4 md:grid-cols-3">
              {PACKAGES.map((pkg) => (
                <div
                  key={pkg.id}
                  className={`rounded-xl border p-5 ${
                    pkg.highlighted
                      ? "border-neutral-900 ring-2 ring-neutral-900"
                      : "border-neutral-200"
                  }`}
                >
                  <div className="mb-2 min-h-6">
                    {"badge" in pkg && pkg.badge ? (
                      <span className="inline-flex rounded-full bg-neutral-900 px-2.5 py-1 text-xs font-semibold text-white">
                        {pkg.badge}
                      </span>
                    ) : null}
                  </div>
                  <h3 className="font-semibold text-neutral-900">{pkg.name}</h3>
                  <p className="mt-1 text-2xl font-bold text-neutral-900">
                    {pkg.setup}
                    <span className="text-base font-normal text-neutral-500">
                      {" "}
                      + {pkg.monthly}
                    </span>
                  </p>
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

      {modal === "edits-exhausted" ? (
        <ModalBackdrop onClose={() => setModal(null)}>
          <div className="p-6 text-center sm:p-8">
            <h2 className="text-xl font-semibold text-neutral-900">
              You&apos;ve used your 3 free edits
            </h2>
            <p className="mt-3 text-sm leading-relaxed text-neutral-600">
              Claim your site to keep editing — choose a plan below and make
              unlimited updates on Pro or Elite.
            </p>
            <button
              type="button"
              onClick={handleClaimSite}
              className="mt-6 rounded-lg bg-neutral-900 px-6 py-2.5 text-sm font-semibold text-white hover:bg-neutral-800"
            >
              Claim your site
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
              We&apos;ll keep your custom site for{" "}
              {fields.businessName || lead.business_name} on file. If you change
              your mind, just reply to our email or reach out anytime — your
              preview link will still work.
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
