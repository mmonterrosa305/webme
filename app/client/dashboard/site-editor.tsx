"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useState } from "react";

import {
  getPlanDisplayName,
  getSiteStatusLabel,
} from "@/lib/client-auth/constants";
import type { SiteContent, SiteImageSlot } from "@/lib/site-editor/types";
import { IMAGE_SLOT_LABELS, IMAGE_SLOTS } from "@/lib/site-editor/types";

type SiteEditorProps = {
  initialContent: SiteContent;
  siteSlug: string;
  plan: string;
  subscriptionStatus: string;
  previewUrl: string;
};

const inputClassName =
  "w-full rounded-lg border border-neutral-300 bg-white px-3 py-2 text-sm text-neutral-900 outline-none transition placeholder:text-neutral-400 focus:border-neutral-900 focus:ring-2 focus:ring-neutral-200";

const labelClassName = "mb-1.5 block text-sm font-medium text-neutral-700";

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
}: SiteEditorProps) {
  const [savedContent, setSavedContent] = useState(initialContent);
  const [draftContent, setDraftContent] = useState(initialContent);
  const [previewHtml, setPreviewHtml] = useState<string | null>(null);
  const [previewLoading, setPreviewLoading] = useState(false);
  const [publishing, setPublishing] = useState(false);
  const [uploadingSlot, setUploadingSlot] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const hasChanges = useMemo(
    () => JSON.stringify(savedContent) !== JSON.stringify(draftContent),
    [draftContent, savedContent],
  );

  const refreshPreview = useCallback(async (content: SiteContent) => {
    setPreviewLoading(true);

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

      setPreviewHtml(data.html ?? null);
    } catch (previewError) {
      setError(
        previewError instanceof Error
          ? previewError.message
          : "Failed to update preview.",
      );
    } finally {
      setPreviewLoading(false);
    }
  }, []);

  useEffect(() => {
    const timer = window.setTimeout(() => {
      void refreshPreview(draftContent);
    }, 400);

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
    <div className="flex min-h-screen flex-col">
      <header className="border-b border-neutral-200 bg-white">
        <div className="mx-auto flex max-w-7xl flex-col gap-4 px-4 py-4 sm:flex-row sm:items-center sm:justify-between sm:px-6">
          <div>
            <p className="text-sm font-medium text-neutral-500">
              MyWebMe client portal
            </p>
            <h1 className="text-xl font-semibold text-neutral-900">
              {draftContent.businessName}
            </h1>
            <p className="mt-1 text-sm text-neutral-600">
              {getPlanDisplayName(plan)} · {getSiteStatusLabel(subscriptionStatus)}
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <Link
              href={previewUrl}
              target="_blank"
              className="rounded-lg border border-neutral-300 px-3 py-2 text-sm font-medium text-neutral-700 transition hover:bg-neutral-50"
            >
              View live site
            </Link>
            <button
              type="button"
              onClick={handleReset}
              disabled={!hasChanges || publishing}
              className="rounded-lg border border-neutral-300 px-3 py-2 text-sm font-medium text-neutral-700 transition hover:bg-neutral-50 disabled:cursor-not-allowed disabled:opacity-50"
            >
              Reset
            </button>
            <button
              type="button"
              onClick={handlePublish}
              disabled={!hasChanges || publishing}
              className="rounded-lg bg-neutral-900 px-4 py-2 text-sm font-semibold text-white transition hover:bg-neutral-800 disabled:cursor-not-allowed disabled:opacity-50"
            >
              {publishing ? "Publishing…" : "Publish"}
            </button>
          </div>
        </div>
      </header>

      {(message || error) && (
        <div className="border-b border-neutral-200 bg-neutral-50 px-4 py-3 sm:px-6">
          {message ? (
            <p className="text-sm text-green-700" role="status">
              {message}
            </p>
          ) : null}
          {error ? (
            <p className="text-sm text-red-600" role="alert">
              {error}
            </p>
          ) : null}
        </div>
      )}

      <div className="mx-auto grid w-full max-w-7xl flex-1 gap-6 px-4 py-6 lg:grid-cols-[380px_1fr] lg:px-6">
        <aside className="space-y-6">
          <section className="rounded-2xl border border-neutral-200 bg-white p-5 shadow-sm">
            <h2 className="text-base font-semibold text-neutral-900">
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

          <section className="rounded-2xl border border-neutral-200 bg-white p-5 shadow-sm">
            <h2 className="text-base font-semibold text-neutral-900">
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

          <section className="rounded-2xl border border-neutral-200 bg-white p-5 shadow-sm">
            <h2 className="text-base font-semibold text-neutral-900">Logo</h2>
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

          <section className="rounded-2xl border border-neutral-200 bg-white p-5 shadow-sm">
            <h2 className="text-base font-semibold text-neutral-900">Photos</h2>
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
        </aside>

        <section className="flex min-h-[70vh] flex-col overflow-hidden rounded-2xl border border-neutral-200 bg-white shadow-sm">
          <div className="flex items-center justify-between border-b border-neutral-200 px-4 py-3">
            <div>
              <h2 className="text-sm font-semibold text-neutral-900">Preview</h2>
              <p className="text-xs text-neutral-500">
                Changes update here before you publish.
              </p>
            </div>
            <p className="text-xs text-neutral-500">
              {previewLoading ? "Updating…" : `/${siteSlug}`}
            </p>
          </div>
          <iframe
            title="Site preview"
            srcDoc={previewHtml ?? ""}
            sandbox="allow-scripts allow-same-origin"
            className="min-h-0 w-full flex-1 border-0 bg-white"
          />
        </section>
      </div>
    </div>
  );
}
