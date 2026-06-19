"use client";

import { useCallback, useEffect, useRef, useState } from "react";

import type { LeadPreview } from "@/lib/leads/types";
import { hasScrollHeroVideo } from "@/lib/agents/scroll-hero-video";
import { normalizeLogoUrl } from "@/lib/site-editor/extract-content";
import { PREVIEW_FREE_EDITS } from "@/lib/plans/edit-limits";

type Modal = "packages" | "declined" | "edits-exhausted" | null;

type PlanId = "starter" | "monthly" | "premium";

type PreviewFields = {
  businessName: string;
  phone: string;
  headline: string;
  tagline: string;
  logoUrl: string;
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
    monthlyStrikethrough: "$59/mo",
    monthlyPromo: "$10/mo",
    offerExpires: "Offer expires 7/1",
    features: [
      "Everything in Pro",
      "Up to 6 pages",
      "SEO + e-commerce ready",
      "Domain checker included",
      "First month free",
    ],
  },
];

function PackagePrice({ pkg }: { pkg: (typeof PACKAGES)[number] }) {
  if ("monthlyPromo" in pkg && pkg.monthlyPromo) {
    return (
      <div className="mt-1">
        <p className="text-2xl font-bold text-neutral-900">{pkg.setup}</p>
        <p className="mt-1 text-base">
          <span className="text-neutral-400 line-through">
            {pkg.monthlyStrikethrough}
          </span>{" "}
          <span className="font-bold text-green-600">{pkg.monthlyPromo}</span>
        </p>
        <p className="mt-1 text-xs text-orange-600">{pkg.offerExpires}</p>
      </div>
    );
  }

  return (
    <p className="mt-1 text-2xl font-bold text-neutral-900">
      {pkg.setup}
      <span className="text-base font-normal text-neutral-500">
        {" "}
        + {pkg.monthly}
      </span>
    </p>
  );
}


function toPreviewFields(
  fields: Partial<PreviewFields> | undefined,
  fallbackBusinessName: string,
): PreviewFields {
  return {
    businessName: fields?.businessName?.trim() || fallbackBusinessName,
    phone: fields?.phone?.trim() ?? "",
    headline: fields?.headline?.trim() ?? "",
    tagline: fields?.tagline?.trim() ?? "",
    logoUrl: normalizeLogoUrl(fields?.logoUrl),
  };
}

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

export function PreviewShell({ lead }: { lead: LeadPreview }) {
  const pricingRef = useRef<HTMLElement>(null);
  const iframeRef = useRef<HTMLIFrameElement>(null);
  const [modal, setModal] = useState<Modal>(null);
  const [payingPlan, setPayingPlan] = useState<PlanId | null>(null);
  const [checkoutError, setCheckoutError] = useState<string | null>(null);
  const [siteHtml, setSiteHtml] = useState(lead.site_html);
  const [fields, setFields] = useState<PreviewFields>({
    businessName: lead.business_name,
    phone: "",
    headline: "",
    tagline: "",
    logoUrl: "",
  });
  const [savedFields, setSavedFields] = useState<PreviewFields | null>(null);
  const [editsRemaining, setEditsRemaining] = useState(PREVIEW_FREE_EDITS);
  const [editsLimit, setEditsLimit] = useState(PREVIEW_FREE_EDITS);
  const [loadingEdits, setLoadingEdits] = useState(true);
  const [saving, setSaving] = useState(false);
  const [editError, setEditError] = useState<string | null>(null);
  const [photoEditMode, setPhotoEditMode] = useState(false);
  const [replacingSlot, setReplacingSlot] = useState<string | null>(null);
  const [shufflingVideo, setShufflingVideo] = useState(false);
  const [uploadingVideo, setUploadingVideo] = useState(false);
  const [uploadingLogo, setUploadingLogo] = useState(false);
  const logoInputRef = useRef<HTMLInputElement>(null);
  const videoInputRef = useRef<HTMLInputElement>(null);

  const hasHeroVideo =
    siteHtml.includes('data-webme="hero-image"') &&
    siteHtml.includes("<video");
  const hasScrollHero = hasScrollHeroVideo(siteHtml);

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
        const nextFields = toPreviewFields(data.fields, lead.business_name);
        setFields(nextFields);
        setSavedFields(nextFields);
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

  useEffect(() => {
    const iframe = iframeRef.current;
    if (!iframe) return;
    const doc = iframe.contentDocument;
    if (!doc) return;
    doc.open();
    doc.write(siteHtml);
    doc.close();
  }, [siteHtml]);

  const injectTextEditors = useCallback(() => {
    const iframe = iframeRef.current;
    if (!iframe) return;

    const doc = iframe.contentDocument;
    if (!doc) return;

    doc.getElementById("webme-text-edit-script")?.remove();
    doc.getElementById("webme-text-edit-styles")?.remove();

    const style = doc.createElement("style");
    style.id = "webme-text-edit-styles";
    style.textContent = `
      [data-webme-editable="true"] {
        cursor: text !important;
        outline: none !important;
        transition: box-shadow 0.15s ease;
      }
      [data-webme-editable="true"]:hover {
        box-shadow: 0 0 0 2px rgba(255, 255, 255, 0.65) !important;
      }
      [data-webme-editable="true"]:focus {
        box-shadow: 0 0 0 2px rgba(255, 255, 255, 0.95) !important;
      }
    `;
    doc.head.appendChild(style);

    const script = doc.createElement("script");
    script.id = "webme-text-edit-script";
    script.textContent = `
      (function () {
        var configs = [
          {
            field: "headline",
            selectors: ['[data-webme="headline"]', "#webme-scroll-hero h1", "section h1"],
          },
          {
            field: "tagline",
            selectors: ['[data-webme="tagline"]', "#webme-scroll-hero .hero-content p", "section .hero-content p"],
          },
          {
            field: "businessName",
            selectors: ['[data-webme="business-name"]', ".logo-text", "nav .logo-text"],
          },
          {
            field: "phone",
            selectors: ['[data-webme="phone"]'],
          },
        ];

        function attachEditor(el, field) {
          if (!el || el.getAttribute("data-webme-editable") === "true") return;

          el.setAttribute("contenteditable", "true");
          el.setAttribute("data-webme-editable", "true");
          el.setAttribute("spellcheck", "false");

          el.addEventListener("keydown", function (event) {
            if (event.key === "Enter") {
              event.preventDefault();
              el.blur();
            }
          });

          el.addEventListener("blur", function () {
            window.parent.postMessage(
              {
                type: "text-edit",
                field: field,
                value: el.textContent.trim(),
              },
              "*",
            );
          });
        }

        configs.forEach(function (config) {
          for (var i = 0; i < config.selectors.length; i++) {
            var el = document.querySelector(config.selectors[i]);
            if (el) {
              attachEditor(el, config.field);
              break;
            }
          }
        });
      })();
    `;
    doc.body.appendChild(script);
  }, []);

  useEffect(() => {
    const iframe = iframeRef.current;
    if (!iframe) return;

    const timeout = window.setTimeout(() => {
      injectTextEditors();
    }, 500);

    return () => {
      window.clearTimeout(timeout);
      const doc = iframe.contentDocument;
      if (doc) {
        doc.getElementById("webme-text-edit-script")?.remove();
        doc.getElementById("webme-text-edit-styles")?.remove();
      }
    };
  }, [siteHtml, injectTextEditors]);

  useEffect(() => {
    function resetPaymentState() {
      setPayingPlan(null);
    }

    window.addEventListener("focus", resetPaymentState);
    return () => window.removeEventListener("focus", resetPaymentState);
  }, []);

  const hasFieldChanges =
    savedFields !== null &&
    (fields.businessName !== savedFields.businessName ||
      fields.phone !== savedFields.phone ||
      fields.headline !== savedFields.headline ||
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
        const nextFields = toPreviewFields(data.fields, lead.business_name);
        setFields(nextFields);
        setSavedFields(nextFields);
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

  const handleLogoUpload = useCallback(
    async (file: File | null) => {
      if (!file) {
        return;
      }

      setUploadingLogo(true);
      setEditError(null);

      try {
        const formData = new FormData();
        formData.append("siteSlug", lead.site_slug);
        formData.append("file", file);

        const response = await fetch("/api/leads/upload-logo", {
          method: "POST",
          body: formData,
        });

        const data = (await response.json()) as {
          logoUrl?: string;
          siteHtml?: string;
          error?: string;
        };

        if (!response.ok) {
          throw new Error(data.error ?? "Failed to upload logo.");
        }

        if (data.siteHtml) {
          setSiteHtml(data.siteHtml);
        }

        if (data.logoUrl) {
          const normalizedLogoUrl = normalizeLogoUrl(data.logoUrl);
          setFields((current) => ({
            ...current,
            logoUrl: normalizedLogoUrl,
          }));
          setSavedFields((current) =>
            current
              ? {
                  ...current,
                  logoUrl: normalizedLogoUrl,
                }
              : current,
          );
        }
      } catch (error) {
        setEditError(
          error instanceof Error ? error.message : "Failed to upload logo.",
        );
      } finally {
        setUploadingLogo(false);
      }
    },
    [lead.site_slug],
  );

  const handleReplacePhoto = useCallback(
    async (slot: string) => {
      setReplacingSlot(slot);

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
          throw new Error(data.error ?? "Failed to replace photo.");
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
      } catch (error) {
        setEditError(
          error instanceof Error ? error.message : "Failed to replace photo.",
        );
      } finally {
        setReplacingSlot(null);
      }
    },
    [lead.industry, lead.site_slug],
  );

  function injectPhotoOverlays() {
    const iframe = iframeRef.current;
    if (!iframe) return;

    const removeOverlays = (doc: Document) => {
      doc.querySelectorAll(".webme-photo-replace-overlay").forEach((element) => {
        element.remove();
      });
      doc.getElementById("webme-photo-edit-script")?.remove();
    };

    const doc = iframe.contentDocument;
    if (!doc) return;

    if (!photoEditMode) {
      removeOverlays(doc);
      return;
    }

    removeOverlays(doc);

    const script = doc.createElement("script");
    script.id = "webme-photo-edit-script";
    script.textContent = `
      (function () {
        var imageSlotPattern = /^(hero-image|about-image|service-image-\\d|gallery-image-\\d|logo)$/;

        function removeOverlays() {
          document.querySelectorAll(".webme-photo-replace-overlay").forEach(function (el) {
            el.remove();
          });
        }

        function attachOverlay(el, slot, label) {
          if (getComputedStyle(el).position === "static") {
            el.style.position = "relative";
          }

          var overlay = document.createElement("div");
          overlay.className = "webme-photo-replace-overlay";

          if (el.tagName === "IMG") {
            var wrapper = document.createElement("div");
            wrapper.style.cssText = "position:relative;display:inline-block;width:100%;height:100%;";
            el.parentElement.insertBefore(wrapper, el);
            wrapper.appendChild(el);
            overlay.style.cssText = "position:absolute;inset:0;background:rgba(0,0,0,0);display:flex;align-items:center;justify-content:center;z-index:9999;pointer-events:auto;";
            wrapper.appendChild(overlay);
          } else {
            overlay.style.cssText = "position:absolute;inset:0;background:rgba(0,0,0,0);display:flex;align-items:center;justify-content:center;z-index:9999;pointer-events:auto;";
            el.appendChild(overlay);
          }

          var button = document.createElement("button");
          button.type = "button";
          button.textContent = label;
          button.style.cssText = "background:#fff;color:#111;border:none;border-radius:8px;padding:8px 16px;font-size:14px;font-weight:600;cursor:pointer;";
          button.onclick = function () {
            if (slot === "logo") {
              window.parent.postMessage({ type: "upload-logo" }, "*");
            } else {
              window.parent.postMessage({ type: "replace-photo", slot: slot }, "*");
            }
          };
          overlay.appendChild(button);
        }

        function addOverlays() {
          removeOverlays();

          document.querySelectorAll("[data-webme]").forEach(function (el) {
            var slot = el.getAttribute("data-webme");
            if (!slot || !imageSlotPattern.test(slot)) return;
            if (slot === "hero-image" && el.tagName === "VIDEO") return;

            attachOverlay(el, slot, slot === "logo" ? "📷 Replace Logo" : "📷 Replace");
          });

          if (!document.querySelector('[data-webme="logo"]')) {
            var logoTargets = document.querySelectorAll("header a, .logo-text, header .logo");
            logoTargets.forEach(function (el) {
              if (el.querySelector("img")) return;
              attachOverlay(el, "logo", "📷 Upload Logo");
            });
          }
        }

        addOverlays();
      })();
    `;
    doc.body.appendChild(script);
  }

  function injectHeroVideoOverlay() {
    const iframe = iframeRef.current;
    if (!iframe) return;

    const removeOverlay = (doc: Document) => {
      doc.querySelectorAll(".webme-hero-shuffle-overlay").forEach((element) => {
        element.remove();
      });
      doc.getElementById("webme-hero-shuffle-script")?.remove();
    };

    const doc = iframe.contentDocument;
    if (!doc) return;

    removeOverlay(doc);

    const heroVideo = doc.querySelector('video[data-webme="hero-image"]');
    if (!heroVideo) {
      return;
    }

    const script = doc.createElement("script");
    script.id = "webme-hero-shuffle-script";
    script.textContent = `
      (function () {
        var hero = document.querySelector('video[data-webme="hero-image"]');
        if (!hero) return;

        var target = hero.parentElement;
        if (!target) return;

        if (getComputedStyle(target).position === "static") {
          target.style.position = "relative";
        }

        document.querySelectorAll(".webme-hero-shuffle-overlay").forEach(function (el) {
          el.remove();
        });

        var overlay = document.createElement("div");
        overlay.className = "webme-hero-shuffle-overlay";
        overlay.style.cssText = "position:absolute;inset:0;background:rgba(0,0,0,0);display:flex;align-items:flex-end;justify-content:flex-end;padding:16px;z-index:99999;pointer-events:none;";

        var button = document.createElement("button");
        button.type = "button";
        button.textContent = ${shufflingVideo ? '"Shuffling..."' : '"🎬 Shuffle Video"'};
        button.disabled = ${shufflingVideo};
        button.style.cssText = "background:#fff;color:#111;border:none;border-radius:8px;padding:8px 16px;font-size:14px;font-weight:600;cursor:pointer;pointer-events:auto;${
          shufflingVideo ? "opacity:0.6;cursor:not-allowed;" : ""
        }";
        button.onclick = function () {
          if (button.disabled) return;
          window.parent.postMessage({ type: "shuffle-video" }, "*");
        };
        overlay.appendChild(button);
        target.appendChild(overlay);
      })();
    `;
    doc.body.appendChild(script);
  }

  const handleUploadHeroVideo = useCallback(
    async (file: File | null) => {
      if (!file) {
        return;
      }

      setUploadingVideo(true);
      setEditError(null);

      try {
        const formData = new FormData();
        formData.append("siteSlug", lead.site_slug);
        formData.append("file", file);

        const response = await fetch("/api/leads/upload-hero-video", {
          method: "POST",
          body: formData,
        });

        const data = (await response.json()) as {
          siteHtml?: string;
          error?: string;
        };

        if (!response.ok) {
          throw new Error(data.error ?? "Failed to upload hero video.");
        }

        if (data.siteHtml) {
          setSiteHtml(data.siteHtml);
        }
      } catch (error) {
        setEditError(
          error instanceof Error
            ? error.message
            : "Failed to upload hero video.",
        );
      } finally {
        setUploadingVideo(false);
      }
    },
    [lead.site_slug],
  );

  const handleShuffleVideo = useCallback(async () => {
    setShufflingVideo(true);

    try {
      const response = await fetch("/api/leads/shuffle-video", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          siteSlug: lead.site_slug,
          industry: lead.industry,
        }),
      });

      const data = (await response.json()) as {
        success?: boolean;
        error?: string;
      };

      if (!response.ok) {
        throw new Error(data.error ?? "Failed to shuffle video.");
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
      setShufflingVideo(false);
    }
  }, [lead.industry, lead.site_slug]);

  useEffect(() => {
    const iframe = iframeRef.current;
    if (!iframe) return;

    const timeout = window.setTimeout(() => {
      injectPhotoOverlays();
    }, 500);

    return () => {
      window.clearTimeout(timeout);
      const doc = iframe.contentDocument;
      if (doc) {
        doc.querySelectorAll(".webme-photo-replace-overlay").forEach((element) => {
          element.remove();
        });
        doc.getElementById("webme-photo-edit-script")?.remove();
      }
    };
  }, [photoEditMode, siteHtml]);

  useEffect(() => {
    const iframe = iframeRef.current;
    if (!iframe) return;

    const timeout = window.setTimeout(() => {
      injectHeroVideoOverlay();
    }, 500);

    return () => {
      window.clearTimeout(timeout);
      const doc = iframe.contentDocument;
      if (doc) {
        doc.querySelectorAll(".webme-hero-shuffle-overlay").forEach((element) => {
          element.remove();
        });
        doc.getElementById("webme-hero-shuffle-script")?.remove();
      }
    };
  }, [siteHtml, shufflingVideo]);

  useEffect(() => {
    function onMessage(event: MessageEvent) {
      const data = event.data as {
        type?: string;
        slot?: string;
        field?: keyof PreviewFields;
        value?: string;
      };
      if (data?.type === "replace-photo" && typeof data.slot === "string") {
        void handleReplacePhoto(data.slot);
      }
      if (data?.type === "upload-logo") {
        logoInputRef.current?.click();
      }
      if (data?.type === "shuffle-video") {
        void handleShuffleVideo();
      }
      if (
        data?.type === "text-edit" &&
        data.field &&
        typeof data.value === "string" &&
        (data.field === "businessName" ||
          data.field === "phone" ||
          data.field === "headline" ||
          data.field === "tagline")
      ) {
        setFields((current) => ({
          ...current,
          [data.field!]: data.value!,
        }));
      }
    }

    window.addEventListener("message", onMessage);
    return () => window.removeEventListener("message", onMessage);
  }, [handleReplacePhoto, handleShuffleVideo]);

  const hasLogo = Boolean(normalizeLogoUrl(fields.logoUrl));

  return (
    <div className="flex min-h-dvh flex-col bg-neutral-100">
      <input
        ref={logoInputRef}
        type="file"
        accept="image/png,image/jpeg,image/webp,image/gif"
        className="hidden"
        onChange={(event) => {
          void handleLogoUpload(event.target.files?.[0] ?? null);
          event.target.value = "";
        }}
      />
      <input
        ref={videoInputRef}
        type="file"
        accept="video/mp4,video/webm,video/quicktime"
        className="hidden"
        onChange={(event) => {
          void handleUploadHeroVideo(event.target.files?.[0] ?? null);
          event.target.value = "";
        }}
      />

      <header className="sticky top-0 z-50 shrink-0 border-b border-neutral-800 bg-[#111111] shadow-lg">
        <div className="mx-auto max-w-7xl px-4 py-3 sm:px-6">
          <div className="flex flex-wrap items-center justify-between gap-3">
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

          <div className="mt-3 flex flex-wrap items-center gap-2 border-t border-neutral-800 pt-3">
            <span className="mr-1 text-xs font-medium uppercase tracking-wide text-neutral-500">
              Edit site
            </span>
            <button
              type="button"
              onClick={() => setPhotoEditMode((current) => !current)}
              className="rounded-lg border border-neutral-600 px-4 py-2 text-sm font-medium text-white transition hover:border-neutral-400 hover:bg-neutral-800"
            >
              {photoEditMode ? "Done Editing" : "Replace Photos"}
            </button>
            <button
              type="button"
              disabled={uploadingLogo}
              onClick={() => logoInputRef.current?.click()}
              className="rounded-lg border border-neutral-600 px-4 py-2 text-sm font-medium text-white transition hover:border-neutral-400 hover:bg-neutral-800 disabled:cursor-not-allowed disabled:opacity-60"
            >
              {uploadingLogo ? "Uploading..." : hasLogo ? "Change Logo" : "Upload Logo"}
            </button>
            <button
              type="button"
              disabled={shufflingVideo}
              onClick={() => void handleShuffleVideo()}
              className="rounded-lg border border-neutral-600 px-4 py-2 text-sm font-medium text-white transition hover:border-neutral-400 hover:bg-neutral-800 disabled:cursor-not-allowed disabled:opacity-60"
            >
              {shufflingVideo ? "Shuffling..." : "Shuffle Video"}
            </button>
            {hasScrollHero || hasHeroVideo ? (
              <button
                type="button"
                disabled={uploadingVideo}
                onClick={() => videoInputRef.current?.click()}
                className="rounded-lg border border-neutral-600 px-4 py-2 text-sm font-medium text-white transition hover:border-neutral-400 hover:bg-neutral-800 disabled:cursor-not-allowed disabled:opacity-60"
              >
                {uploadingVideo ? "Uploading..." : "Upload Custom Video"}
              </button>
            ) : null}
          </div>
        </div>
      </header>

      <div className="shrink-0 border-b border-neutral-200 bg-white px-4 py-3 sm:px-6">
        <div className="mx-auto flex max-w-7xl flex-wrap items-center gap-4">
          <div className="min-w-0 flex-1">
            <p className="text-xs font-semibold uppercase tracking-wide text-neutral-500">
              Logo
            </p>
            <p className="mt-0.5 text-sm text-neutral-600">
              {hasLogo
                ? "Upload a new image to replace your logo."
                : "No logo yet — upload one to brand your site header."}
            </p>
          </div>
          {hasLogo ? (
            <img
              src={fields.logoUrl}
              alt="Current logo"
              className="h-14 w-auto max-w-[180px] rounded border border-neutral-200 bg-neutral-50 object-contain p-2"
            />
          ) : (
            <div className="flex h-14 min-w-[120px] items-center justify-center rounded border border-dashed border-neutral-300 bg-neutral-50 px-4 text-xs text-neutral-500">
              No logo uploaded
            </div>
          )}
          <button
            type="button"
            disabled={uploadingLogo}
            onClick={() => logoInputRef.current?.click()}
            className="rounded-lg bg-neutral-900 px-4 py-2 text-sm font-semibold text-white transition hover:bg-neutral-800 disabled:cursor-not-allowed disabled:opacity-60"
          >
            {uploadingLogo
              ? "Uploading..."
              : hasLogo
                ? "Replace Logo"
                : "Upload Logo"}
          </button>
        </div>
      </div>

      <div className="shrink-0 border-b border-neutral-200 bg-neutral-50 px-4 py-2.5 sm:px-6">
        <p className="mx-auto max-w-7xl text-sm text-neutral-600">
          Click the headline, tagline, business name, or phone number on the
          site preview to edit text directly.
        </p>
      </div>

      <iframe
        ref={iframeRef}
        title={`Website preview for ${lead.business_name}`}
        sandbox="allow-scripts allow-same-origin"
        className="min-h-[55vh] w-full flex-1 border-0 bg-white"
        onLoad={() => {
          injectTextEditors();
          injectHeroVideoOverlay();
          if (photoEditMode) {
            injectPhotoOverlays();
          }
        }}
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
                <PackagePrice pkg={pkg} />
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
                  <PackagePrice pkg={pkg} />
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
