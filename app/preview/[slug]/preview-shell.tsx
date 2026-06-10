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

const SHUFFLE_SLOTS = [
  { slot: "about-image", label: "About" },
  { slot: "service-image-1", label: "Service 1" },
  { slot: "service-image-2", label: "Service 2" },
  { slot: "service-image-3", label: "Service 3" },
  { slot: "service-image-4", label: "Service 4" },
  { slot: "gallery-image-1", label: "Gallery 1" },
  { slot: "gallery-image-2", label: "Gallery 2" },
  { slot: "gallery-image-3", label: "Gallery 3" },
] as const;

const SLOT_LABELS: Record<string, string> = {
  "about-image": "About Image",
  "service-image-1": "Service Card 1",
  "service-image-2": "Service Card 2",
  "service-image-3": "Service Card 3",
  "service-image-4": "Service Card 4",
  "gallery-image-1": "Gallery Left",
  "gallery-image-2": "Gallery Center",
  "gallery-image-3": "Gallery Right",
};

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
  shuffleMode,
}: {
  lead: LeadPreview;
  shuffleMode?: boolean;
}) {
  const pricingRef = useRef<HTMLElement>(null);
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
  const [shufflingSlot, setShufflingSlot] = useState<string | null>(null);
  const [hoveredSlot, setHoveredSlot] = useState<string | null>(null);
  const [tooltipPosition, setTooltipPosition] = useState({ x: 0, y: 0 });

  const loadEditStatus = useCallback(async () => {
    try {
      const response = await fetch(`/api/preview/${lead.site_slug}/edits`);
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
  }, [lead.site_slug]);

  useEffect(() => {
    void loadEditStatus();
  }, [loadEditStatus]);

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
      const response = await fetch(`/api/preview/${lead.site_slug}/edits`, {
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

  async function handleShufflePhoto(slot: string) {
    setShufflingSlot(slot);

    try {
      const response = await fetch("/api/leads/shuffle-photo", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          siteSlug: lead.site_slug,
          slot,
          industry: lead.industry,
        }),
      });

      const data = (await response.json()) as {
        success?: boolean;
        error?: string;
      };

      if (!response.ok) {
        throw new Error(data.error ?? "Failed to shuffle photo.");
      }

      const htmlResponse = await fetch(`/api/preview/${lead.site_slug}/edits`);
      const htmlData = (await htmlResponse.json()) as {
        siteHtml?: string;
        error?: string;
      };

      if (!htmlResponse.ok || !htmlData.siteHtml) {
        throw new Error(htmlData.error ?? "Failed to refresh preview.");
      }

      setSiteHtml(htmlData.siteHtml);
    } finally {
      setShufflingSlot(null);
    }
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
            {shuffleMode ? (
              <span className="rounded-lg border border-neutral-600 px-4 py-2 text-sm font-medium text-white">
                Photo Edit Mode
              </span>
            ) : (
              <>
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
              </>
            )}
            <a
              href={`/site/${lead.site_slug}`}
              target="_blank"
              rel="noopener noreferrer"
              className="rounded-lg border border-neutral-600 px-4 py-2 text-sm font-medium text-white transition hover:border-neutral-400 hover:bg-neutral-800"
            >
              View full site
            </a>
          </div>
        </div>
      </header>

      {shuffleMode ? (
        <div
          className="flex flex-wrap gap-2 border-b border-neutral-200 bg-white px-4 py-3 sm:px-6"
          onMouseMove={(event) => {
            setTooltipPosition({ x: event.clientX, y: event.clientY });
          }}
        >
          {SHUFFLE_SLOTS.map(({ slot, label }) => (
            <button
              key={slot}
              type="button"
              onClick={() => void handleShufflePhoto(slot)}
              onMouseEnter={() => setHoveredSlot(slot)}
              onMouseLeave={() => setHoveredSlot(null)}
              disabled={shufflingSlot !== null}
              className="rounded-lg border border-neutral-300 bg-white px-3 py-1.5 text-xs font-medium text-neutral-700 transition hover:bg-neutral-50 disabled:opacity-60"
            >
              {shufflingSlot === slot ? "Shuffling..." : `${label} 🔀`}
            </button>
          ))}
        </div>
      ) : null}

      <iframe
        title={`Website preview for ${lead.business_name}`}
        srcDoc={siteHtml}
        sandbox="allow-scripts allow-same-origin"
        className="min-h-[55vh] w-full flex-1 border-0 bg-white"
      />

      {editsRemaining > 0 ? (
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
            Choose a plan to launch {fields.businessName || lead.business_name}{" "}
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

      {hoveredSlot ? (
        <div
          className="pointer-events-none fixed z-[9999] rounded-lg bg-neutral-900 px-3 py-1.5 text-xs font-medium text-white shadow-lg"
          style={{
            left: tooltipPosition.x + 12,
            top: tooltipPosition.y + 12,
          }}
        >
          📍 Will replace: {SLOT_LABELS[hoveredSlot] ?? hoveredSlot}
        </div>
      ) : null}
    </div>
  );
}
