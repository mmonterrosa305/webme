"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";

import {
  getPlanDisplayName,
  getSiteStatusLabel,
  isPortalEligiblePlan,
} from "@/lib/client-auth/constants";
import type { SiteContent, SiteImageSlot } from "@/lib/site-editor/types";
import { IMAGE_SLOT_LABELS, IMAGE_SLOTS } from "@/lib/site-editor/types";

import { DomainClaimSection } from "./domain-claim-section";
import { UpgradeSuccessBanner } from "./upgrade-success-banner";

type SiteEditorProps = {
  initialContent: SiteContent;
  siteSlug: string;
  plan: string;
  subscriptionStatus: string;
  previewUrl: string;
  domainRequested?: string | null;
  domainStatus?: string | null;
  showUpgradeSuccess?: boolean;
};

const inputClassName =
  "w-full rounded-lg border border-neutral-300 bg-white px-3 py-2 text-sm text-neutral-900 outline-none transition placeholder:text-neutral-400 focus:border-neutral-900 focus:ring-2 focus:ring-neutral-200";

const labelClassName = "mb-1.5 block text-sm font-medium text-neutral-700";

const PREVIEW_DEBOUNCE_MS = 1000;

function cloneContent(content: SiteContent): SiteContent {
  return {
    ...content,
    images: { ...content.images },
  };
}

export function SiteEditor({
  initialContent,
  siteSlug,
  plan,
  subscriptionStatus,
  previewUrl,
  domainRequested = null,
  domainStatus = null,
  showUpgradeSuccess = false,
}: SiteEditorProps) {
  const showDomainClaimSection =
    isPortalEligiblePlan(plan) && domainStatus !== "active";
  const [savedContent, setSavedContent] = useState(initialContent);
  const [draftContent, setDraftContent] = useState(initialContent);
  const [previewSrc, setPreviewSrc] = useState<string | null>(null);
  const [previewLoading, setPreviewLoading] = useState(true);
  const [publishing, setPublishing] = useState(false);
  const [uploadingSlot, setUploadingSlot] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const previewBlobRef = useRef<string | null>(null);

  const hasChanges = useMemo(
    () => JSON.stringify(savedContent) !== JSON.stringify(draftContent),
    [draftContent, savedContent],
  );

  const setPreviewFromHtml = useCallback((html: string) => {
    const blob = new Blob([html], { type: "text/html" });
    const nextSrc = URL.createObjectURL(blob);

    if (previewBlobRef.current) {
      URL.revokeObjectURL(previewBlobRef.current);
    }

    previewBlobRef.current = nextSrc;
    setPreviewSrc(nextSrc);
  }, []);

  useEffect(() => {
    return () => {
      if (previewBlobRef.current) {
        URL.revokeObjectURL(previewBlobRef.current);
      }
    };
  }, []);

  const refreshPreview = useCallback(
    async (content: SiteContent) => {
      try {
        const response = await fetch("/api/client/site/preview", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ content }),
        });

        const data = (await response.json()) as { html?: string; error?: string };

        if (!response.ok) {
          throw new Error(data.error ?? "Failed to update preview.");
        }

        if (data.html) {
          setPreviewFromHtml(data.html);
        }
      } catch (previewError) {
        setError(
          previewError instanceof Error
            ? previewError.message
            : "Failed to update preview.",
        );
      } finally {
        setPreviewLoading(false);
      }
    },
    [setPreviewFromHtml],
  );

  useEffect(() => {
    const timer = window.setTimeout(() => {
      void refreshPreview(draftContent);
    }, PREVIEW_DEBOUNCE_MS);

    return () => window.clearTimeout(timer);
  }, [draftContent, refreshPreview]);

  function updateField<K extends keyof SiteContent>(
    key: K,
    value: SiteContent[K],
  ) {
    setDraftContent((current) => ({ ...current, [key]: value }));
    setMessage(null);
    setError(null);
  }

  function updateImage(slot: SiteImageSlot, url: string) {
    setDraftContent((current) => ({
      ...current,
      images: { ...current.images, [slot]: url },
    }));
    setMessage(null);
    setError(null);
  }

  async function handleUpload(
    slot: SiteImageSlot | "logo",
    file: File | null,
  ) {
    if (!file) {
      return;
    }

    setUploadingSlot(slot);
    setError(null);

    try {
      const formData = new FormData();
      formData.append("slot", slot);
      formData.append("file", file);

      const response = await fetch("/api/client/site/upload", {
        method: "POST",
        body: formData,
      });

      const data = (await response.json()) as { url?: string; error?: string };

      if (!response.ok) {
        throw new Error(data.error ?? "Upload failed.");
      }

      if (!data.url) {
        throw new Error("Upload did not return a URL.");
      }

      if (slot === "logo") {
        updateField("logoUrl", data.url);
      } else {
        updateImage(slot, data.url);
      }
    } catch (uploadError) {
      setError(
        uploadError instanceof Error ? uploadError.message : "Upload failed.",
      );
    } finally {
      setUploadingSlot(null);
    }
  }

  async function handlePublish() {
    setPublishing(true);
    setError(null);
    setMessage(null);

    try {
      const response = await fetch("/api/client/site/publish", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ content: draftContent }),
      });

      const data = (await response.json()) as {
        message?: string;
        error?: string;
      };

      if (!response.ok) {
        throw new Error(data.error ?? "Failed to publish.");
      }

      setSavedContent(cloneContent(draftContent));
      setMessage(data.message ?? "Your site is live.");
    } catch (publishError) {
      setError(
        publishError instanceof Error
          ? publishError.message
          : "Failed to publish.",
      );
    } finally {
      setPublishing(false);
    }
  }

  function handleReset() {
    setDraftContent(cloneContent(savedContent));
    setMessage(null);
    setError(null);
  }

  return (
    <div
      style={{
        display: "flex",
        flexDirection: "column",
        height: "100vh",
        overflow: "hidden",
      }}
    >
      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          padding: "12px 20px",
          borderBottom: "1px solid #e5e7eb",
          background: "white",
          flexShrink: 0,
        }}
      >
        <div style={{ minWidth: 0 }}>
          <p
            style={{
              margin: 0,
              fontSize: "14px",
              fontWeight: 600,
              color: "#111827",
              overflow: "hidden",
              textOverflow: "ellipsis",
              whiteSpace: "nowrap",
            }}
          >
            {draftContent.businessName}
          </p>
          <p
            style={{
              margin: "2px 0 0",
              fontSize: "12px",
              color: "#6b7280",
              overflow: "hidden",
              textOverflow: "ellipsis",
              whiteSpace: "nowrap",
            }}
          >
            {getPlanDisplayName(plan)} · {getSiteStatusLabel(subscriptionStatus)}
          </p>
        </div>

        <div style={{ display: "flex", alignItems: "center", gap: "8px", flexShrink: 0 }}>
          <Link
            href={previewUrl}
            target="_blank"
            rel="noopener noreferrer"
            style={{
              display: "inline-block",
              padding: "6px 12px",
              fontSize: "12px",
              fontWeight: 500,
              color: "#374151",
              border: "1px solid #d1d5db",
              borderRadius: "6px",
              textDecoration: "none",
              background: "white",
            }}
          >
            View live
          </Link>
          <button
            type="button"
            onClick={handleReset}
            disabled={!hasChanges || publishing}
            style={{
              padding: "6px 12px",
              fontSize: "12px",
              fontWeight: 500,
              color: "#374151",
              border: "1px solid #d1d5db",
              borderRadius: "6px",
              background: "white",
              cursor: !hasChanges || publishing ? "not-allowed" : "pointer",
              opacity: !hasChanges || publishing ? 0.5 : 1,
            }}
          >
            Reset
          </button>
          <button
            type="button"
            onClick={handlePublish}
            disabled={!hasChanges || publishing}
            style={{
              padding: "6px 12px",
              fontSize: "12px",
              fontWeight: 600,
              color: "white",
              border: "none",
              borderRadius: "6px",
              background: "#111827",
              cursor: !hasChanges || publishing ? "not-allowed" : "pointer",
              opacity: !hasChanges || publishing ? 0.5 : 1,
            }}
          >
            {publishing ? "Publishing…" : "Publish"}
          </button>
        </div>
      </div>

      {showUpgradeSuccess ? <UpgradeSuccessBanner /> : null}

      {(message || error) && (
        <div
          style={{
            flexShrink: 0,
            padding: "8px 20px",
            borderBottom: "1px solid #e5e7eb",
            background: "white",
          }}
        >
          {message ? (
            <p style={{ margin: 0, fontSize: "14px", color: "#15803d" }} role="status">
              {message}
            </p>
          ) : null}
          {error ? (
            <p style={{ margin: 0, fontSize: "14px", color: "#dc2626" }} role="alert">
              {error}
            </p>
          ) : null}
        </div>
      )}

      <div
        style={{
          display: "flex",
          flexDirection: "row",
          flex: 1,
          minHeight: 0,
          height: "100%",
          overflow: "hidden",
        }}
      >
        <div
          style={{
            width: "380px",
            minWidth: "380px",
            height: "100%",
            overflowY: "auto",
            background: "white",
            borderRight: "1px solid #e5e7eb",
            padding: "20px 16px",
            boxSizing: "border-box",
          }}
        >
          <div style={{ display: "flex", flexDirection: "column", gap: "20px" }}>
          <section className="rounded-xl border border-neutral-200 bg-neutral-50/50 p-4">
            <h2 className="text-sm font-semibold text-neutral-900">
              Business info
            </h2>
            <div className="mt-4 space-y-4">
              <div>
                <label htmlFor="businessName" className={labelClassName}>
                  Business name
                </label>
                <input
                  id="businessName"
                  value={draftContent.businessName}
                  onChange={(event) =>
                    updateField("businessName", event.target.value)
                  }
                  className={inputClassName}
                />
              </div>
              <div>
                <label htmlFor="phone" className={labelClassName}>
                  Phone number
                </label>
                <input
                  id="phone"
                  value={draftContent.phone}
                  onChange={(event) => updateField("phone", event.target.value)}
                  className={inputClassName}
                />
              </div>
              <div>
                <label htmlFor="address" className={labelClassName}>
                  Address
                </label>
                <input
                  id="address"
                  value={draftContent.address}
                  onChange={(event) =>
                    updateField("address", event.target.value)
                  }
                  className={inputClassName}
                />
              </div>
              <div>
                <label htmlFor="hours" className={labelClassName}>
                  Business hours
                </label>
                <textarea
                  id="hours"
                  rows={4}
                  value={draftContent.hours}
                  onChange={(event) => updateField("hours", event.target.value)}
                  placeholder={"Mon–Fri 8am–6pm\nSat 9am–2pm"}
                  className={inputClassName}
                />
                <p className="mt-1 text-xs text-neutral-500">
                  One line per entry.
                </p>
              </div>
            </div>
          </section>

          <section className="rounded-xl border border-neutral-200 bg-neutral-50/50 p-4">
            <h2 className="text-sm font-semibold text-neutral-900">
              Headline & tagline
            </h2>
            <div className="mt-4 space-y-4">
              <div>
                <label htmlFor="headline" className={labelClassName}>
                  Main headline
                </label>
                <input
                  id="headline"
                  value={draftContent.headline}
                  onChange={(event) =>
                    updateField("headline", event.target.value)
                  }
                  className={inputClassName}
                />
              </div>
              <div>
                <label htmlFor="tagline" className={labelClassName}>
                  Tagline
                </label>
                <textarea
                  id="tagline"
                  rows={3}
                  value={draftContent.tagline}
                  onChange={(event) =>
                    updateField("tagline", event.target.value)
                  }
                  className={inputClassName}
                />
              </div>
            </div>
          </section>

          <section className="rounded-xl border border-neutral-200 bg-neutral-50/50 p-4">
            <h2 className="text-sm font-semibold text-neutral-900">Logo</h2>
            <div className="mt-4 space-y-3">
              {draftContent.logoUrl ? (
                <img
                  src={draftContent.logoUrl}
                  alt="Current logo"
                  className="h-16 w-auto max-w-full rounded border border-neutral-200 bg-neutral-50 object-contain p-2"
                />
              ) : null}
              <input
                type="file"
                accept="image/png,image/jpeg,image/webp,image/svg+xml"
                disabled={uploadingSlot === "logo"}
                onChange={(event) => {
                  void handleUpload("logo", event.target.files?.[0] ?? null);
                  event.target.value = "";
                }}
                className="block w-full text-sm text-neutral-600 file:mr-3 file:rounded-lg file:border-0 file:bg-neutral-900 file:px-3 file:py-2 file:text-sm file:font-medium file:text-white"
              />
              {uploadingSlot === "logo" ? (
                <p className="text-xs text-neutral-500">Uploading…</p>
              ) : null}
            </div>
          </section>

          <section className="rounded-xl border border-neutral-200 bg-neutral-50/50 p-4">
            <h2 className="text-sm font-semibold text-neutral-900">Photos</h2>
            <div className="mt-4 space-y-4">
              {IMAGE_SLOTS.map((slot) => (
                <div key={slot}>
                  <label className={labelClassName}>
                    {IMAGE_SLOT_LABELS[slot]}
                  </label>
                  {draftContent.images[slot] ? (
                    <img
                      src={draftContent.images[slot]}
                      alt={IMAGE_SLOT_LABELS[slot]}
                      className="mb-2 h-24 w-full rounded-lg border border-neutral-200 object-cover"
                    />
                  ) : null}
                  <input
                    type="file"
                    accept="image/png,image/jpeg,image/webp"
                    disabled={uploadingSlot === slot}
                    onChange={(event) => {
                      void handleUpload(slot, event.target.files?.[0] ?? null);
                      event.target.value = "";
                    }}
                    className="block w-full text-sm text-neutral-600 file:mr-3 file:rounded-lg file:border-0 file:bg-neutral-100 file:px-3 file:py-1.5 file:text-xs file:font-medium file:text-neutral-800"
                  />
                  {uploadingSlot === slot ? (
                    <p className="mt-1 text-xs text-neutral-500">Uploading…</p>
                  ) : null}
                </div>
              ))}
            </div>
          </section>
          </div>
        </div>

        <div
          style={{
            flex: 1,
            height: "100%",
            background: "#f3f4f6",
            position: "relative",
            minWidth: 0,
          }}
        >
          {previewLoading && !previewSrc ? (
            <div
              style={{
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                width: "100%",
                height: "100%",
                fontSize: "14px",
                color: "#6b7280",
              }}
            >
              Loading preview…
            </div>
          ) : null}
          {previewSrc ? (
            <iframe
              title="Site preview"
              src={previewSrc}
              sandbox="allow-scripts allow-same-origin"
              style={{ width: "100%", height: "100%", border: "none" }}
            />
          ) : !previewLoading ? (
            <div
              style={{
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                width: "100%",
                height: "100%",
                fontSize: "14px",
                color: "#9ca3af",
              }}
            >
              Preview will appear here
            </div>
          ) : null}
        </div>
      </div>

      {showDomainClaimSection ? (
        <div
          style={{
            flexShrink: 0,
            borderTop: "1px solid #e5e7eb",
            background: "#ffffff",
            overflowY: "auto",
            maxHeight: "45vh",
            display: "flex",
            justifyContent: "center",
            width: "100%",
            boxSizing: "border-box",
          }}
        >
          <DomainClaimSection
            plan={plan}
            domainRequested={domainRequested}
            domainStatus={domainStatus}
          />
        </div>
      ) : null}
    </div>
  );
}
