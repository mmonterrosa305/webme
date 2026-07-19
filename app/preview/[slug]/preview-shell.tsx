"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useSearchParams } from "next/navigation";

import type { LeadPreview } from "@/lib/leads/types";
import {
  extractScrollHeroVideoUrl,
  hasScrollHeroVideo,
  matchPresetIdFromVideoUrl,
} from "@/lib/agents/scroll-hero-video";
import { normalizeLogoUrl } from "@/lib/site-editor/extract-content";
import { PREVIEW_FREE_EDITS } from "@/lib/plans/edit-limits";
import {
  HOSTING_MONTHLY_FEE_DISPLAY,
  PLAN_FEATURES,
} from "@/lib/plans/pricing";
import { formatSiteBuildPriceDisplay } from "@/lib/plans/build-price";
import { getLeadBuildPriceUsd } from "@/lib/leads/site-build-options";

import { PresetVideoPicker } from "@/app/(dashboard)/_components/preset-video-picker";
import { PresetImageSequencePicker } from "@/app/(dashboard)/_components/preset-image-sequence-picker";
import { ScrollHeroSequenceHero } from "@/components/scroll-hero-sequence/scroll-hero-sequence-hero";
import { SiteContentFrame } from "@/components/site-content-frame";

type Modal = "packages" | "declined" | "edits-exhausted" | "pick-preset" | "pick-sequence" | null;

type PreviewFields = {
  businessName: string;
  phone: string;
  headline: string;
  tagline: string;
  logoUrl: string;
};

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

export function PreviewShell({
  lead,
  scrollHeroSequenceId = null,
  sequenceHero = null,
  publicMode = false,
  hasPaidClient = false,
}: {
  lead: LeadPreview;
  scrollHeroSequenceId?: string | null;
  sequenceHero?: {
    headline?: string;
    tagline?: string;
    posterUrl?: string;
  } | null;
  publicMode?: boolean;
  hasPaidClient?: boolean;
}) {
  const searchParams = useSearchParams();
  const isPublicMode =
    publicMode || searchParams.get("mode") === "public";

  const pricingRef = useRef<HTMLElement>(null);
  const iframeRef = useRef<HTMLIFrameElement>(null);
  const [modal, setModal] = useState<Modal>(null);
  const [paying, setPaying] = useState(false);
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
  const [applyingPresetId, setApplyingPresetId] = useState<string | null>(null);
  const [applyingSequenceId, setApplyingSequenceId] = useState<string | null>(
    null,
  );
  const [activePresetId, setActivePresetId] = useState<string | null>(null);
  const [scrollSequenceId, setScrollSequenceId] = useState<string | null>(
    scrollHeroSequenceId,
  );
  const [heroOverlay, setHeroOverlay] = useState(sequenceHero);
  const [activeSequenceId, setActiveSequenceId] = useState<string | null>(
    scrollHeroSequenceId,
  );
  const [uploadingLogo, setUploadingLogo] = useState(false);
  const logoInputRef = useRef<HTMLInputElement>(null);
  const videoInputRef = useRef<HTMLInputElement>(null);
  const photoInputRef = useRef<HTMLInputElement>(null);
  const pendingPhotoSlotRef = useRef<string | null>(null);

  const hasScrollHero = hasScrollHeroVideo(siteHtml);
  const hasScrollSequence = Boolean(scrollSequenceId);
  const scrollVideoControlsDisabled =
    shufflingVideo ||
    uploadingVideo ||
    applyingPresetId !== null ||
    applyingSequenceId !== null;

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
    if (isPublicMode) {
      setLoadingEdits(false);
      return;
    }
    void loadEditStatus();
  }, [loadEditStatus, isPublicMode]);

  /** Unlock document scroll so page content flows below the 100vh autoplay hero. */
  useEffect(() => {
    // Public mode always unlocks. Edit mode must unlock too when the external
    // sequence hero is present — otherwise body `h-full` + flex shrink clips it.
    if (!isPublicMode && !scrollSequenceId) {
      return;
    }

    const html = document.documentElement;
    const body = document.body;

    const unlock = () => {
      html.classList.remove("h-full");
      html.classList.add("webme-seq-hero-page");
      body.classList.remove("h-full", "min-h-0");
      body.classList.add("webme-seq-hero-page");

      html.style.setProperty("overflow", "auto", "important");
      html.style.setProperty("overflow-y", "auto", "important");
      html.style.setProperty("height", "auto", "important");
      html.style.setProperty("max-height", "none", "important");
      html.style.setProperty("min-height", "100%", "important");

      body.style.setProperty("overflow", "visible", "important");
      body.style.setProperty("overflow-y", "visible", "important");
      body.style.setProperty("height", "auto", "important");
      body.style.setProperty("max-height", "none", "important");
      body.style.setProperty("min-height", "100%", "important");
      body.style.setProperty("display", "block", "important");
      body.style.flexDirection = "";
    };

    unlock();
    // One double-rAF pass catches style/layout that applies after first paint.
    let innerRafId = 0;
    const outerRafId = window.requestAnimationFrame(() => {
      innerRafId = window.requestAnimationFrame(unlock);
    });

    // Re-unlock only when something puts scroll-lock classes/styles back —
    // not on a blind 0/250/1000/4000ms cascade (that caused preview flicker).
    const observer = new MutationObserver(() => {
      if (
        html.classList.contains("h-full") ||
        body.classList.contains("h-full") ||
        body.classList.contains("min-h-0")
      ) {
        unlock();
      }
    });
    observer.observe(html, {
      attributes: true,
      attributeFilter: ["class", "style"],
    });
    observer.observe(body, {
      attributes: true,
      attributeFilter: ["class", "style"],
    });

    // Do NOT re-lock on cleanup — restoring h-full trapped live preview visitors.
    return () => {
      window.cancelAnimationFrame(outerRafId);
      window.cancelAnimationFrame(innerRafId);
      observer.disconnect();
      unlock();
    };
  }, [isPublicMode, scrollSequenceId]);

  // Public-mode site HTML is sized by <SiteContentFrame> (ResizeObserver).
  // Do not run a parallel iframe height timer cascade here — it flickered.
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
      setPaying(false);
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

  async function handlePayNow() {
    setCheckoutError(null);
    setPaying(true);

    try {
      const res = await fetch("/api/stripe/checkout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ slug: lead.site_slug }),
      });
      const data = (await res.json()) as { url?: string; error?: string };
      console.log("Checkout response:", data);
      if (data.url) {
        window.location.href = data.url;
      } else {
        console.error("No URL in response:", data);
        alert("Checkout error: " + JSON.stringify(data));
        setCheckoutError(data.error ?? "Could not start checkout.");
        setPaying(false);
      }
    } catch (err) {
      console.error("Checkout fetch error:", err);
      alert("Checkout error: " + err);
      setCheckoutError(
        err instanceof Error ? err.message : "Checkout failed.",
      );
      setPaying(false);
    }
  }

  function PricingCard({
    className = "",
    buildPriceDisplay,
  }: {
    className?: string;
    buildPriceDisplay: string;
  }) {
    const pricingHeadline = `${buildPriceDisplay} + first month free, then ${HOSTING_MONTHLY_FEE_DISPLAY} hosting`;
    const pricingSubline = `${buildPriceDisplay} one-time site build · first month of hosting free`;

    return (
      <div
        className={`mx-auto max-w-md rounded-xl border-2 border-neutral-900 p-5 ${className}`}
      >
        <h3 className="font-semibold text-neutral-900">WebMe</h3>
        <p className="mt-1 text-2xl font-bold text-neutral-900">
          {pricingHeadline}
        </p>
        <p className="mt-1 text-sm text-neutral-500">{pricingSubline}</p>
        <ul className="mt-3 space-y-1 text-sm text-neutral-600">
          {PLAN_FEATURES.map((feature) => (
            <li key={feature}>• {feature}</li>
          ))}
        </ul>
        <button
          type="button"
          onClick={() => void handlePayNow()}
          disabled={paying}
          className="mt-4 w-full rounded-lg bg-neutral-900 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-neutral-800 disabled:cursor-not-allowed disabled:opacity-60"
        >
          {paying ? "Redirecting…" : "Pay Now"}
        </button>
      </div>
    );
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
      setEditError(null);

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
          siteHtml?: string;
          error?: string;
        };

        if (!response.ok) {
          throw new Error(data.error ?? "Failed to shuffle photo.");
        }

        if (data.siteHtml) {
          setSiteHtml(data.siteHtml);
          return;
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
          error instanceof Error ? error.message : "Failed to shuffle photo.",
        );
      } finally {
        setReplacingSlot(null);
      }
    },
    [lead.industry, lead.site_slug],
  );

  const handleUploadPhoto = useCallback(
    async (slot: string, file: File | null) => {
      if (!file) {
        return;
      }

      setReplacingSlot(slot);
      setEditError(null);

      try {
        const formData = new FormData();
        formData.append("siteSlug", lead.site_slug);
        formData.append("slot", slot);
        formData.append("file", file);

        const response = await fetch("/api/leads/upload-photo", {
          method: "POST",
          body: formData,
        });

        const data = (await response.json()) as {
          success?: boolean;
          siteHtml?: string;
          error?: string;
        };

        if (!response.ok) {
          throw new Error(data.error ?? "Failed to upload photo.");
        }

        if (data.siteHtml) {
          setSiteHtml(data.siteHtml);
        }
      } catch (error) {
        setEditError(
          error instanceof Error ? error.message : "Failed to upload photo.",
        );
      } finally {
        setReplacingSlot(null);
      }
    },
    [lead.site_slug],
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

    const busySlot = replacingSlot ? JSON.stringify(replacingSlot) : "null";
    const script = doc.createElement("script");
    script.id = "webme-photo-edit-script";
    script.textContent = `
      (function () {
        var imageSlotPattern = /^(hero-image|about-image|service-image-\\d|gallery-image-\\d|logo)$/;
        var busySlot = ${busySlot};

        function removeOverlays() {
          document.querySelectorAll(".webme-photo-replace-overlay").forEach(function (el) {
            el.remove();
          });
        }

        function makeButton(text, disabled, onClick) {
          var button = document.createElement("button");
          button.type = "button";
          button.textContent = text;
          button.disabled = disabled;
          button.style.cssText = "background:#fff;color:#111;border:none;border-radius:8px;padding:8px 14px;font-size:13px;font-weight:600;cursor:pointer;pointer-events:auto;" + (disabled ? "opacity:0.6;cursor:not-allowed;" : "");
          button.onclick = function (event) {
            event.preventDefault();
            event.stopPropagation();
            if (button.disabled) return;
            onClick();
          };
          return button;
        }

        function attachOverlay(el, slot, isLogo) {
          if (el.querySelector && el.querySelector(".webme-photo-replace-overlay")) {
            return;
          }

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
            overlay.style.cssText = "position:absolute;inset:0;background:rgba(0,0,0,0.35);display:flex;align-items:center;justify-content:center;gap:8px;flex-wrap:wrap;padding:8px;z-index:9999;pointer-events:auto;";
            wrapper.appendChild(overlay);
          } else {
            overlay.style.cssText = "position:absolute;inset:0;background:rgba(0,0,0,0.35);display:flex;align-items:center;justify-content:center;gap:8px;flex-wrap:wrap;padding:8px;z-index:9999;pointer-events:auto;";
            el.appendChild(overlay);
          }

          var busy = busySlot === slot;

          if (isLogo) {
            overlay.appendChild(makeButton(busy ? "Working…" : "Upload Logo", busy, function () {
              window.parent.postMessage({ type: "upload-logo" }, "*");
            }));
            return;
          }

          overlay.appendChild(makeButton(busy ? "…" : "Shuffle", busy, function () {
            window.parent.postMessage({ type: "shuffle-photo", slot: slot }, "*");
          }));
          overlay.appendChild(makeButton(busy ? "…" : "Upload", busy, function () {
            window.parent.postMessage({ type: "upload-photo", slot: slot }, "*");
          }));
        }

        function addOverlays() {
          removeOverlays();

          document.querySelectorAll("[data-webme]").forEach(function (el) {
            var slot = el.getAttribute("data-webme");
            if (!slot || !imageSlotPattern.test(slot)) return;
            if (slot === "hero-image" && el.tagName === "VIDEO") return;

            attachOverlay(el, slot, slot === "logo");
          });

          // Service cards: background often lives on the card (service-card),
          // with the replaceable slot in data-webme-image-slot.
          document.querySelectorAll("[data-webme-image-slot]").forEach(function (el) {
            var slot = el.getAttribute("data-webme-image-slot");
            if (!slot || !imageSlotPattern.test(slot)) return;
            if (el.querySelector(".webme-photo-replace-overlay")) return;
            attachOverlay(el, slot, false);
          });

          // Fallback: service cards that still lack any image slot marker
          document.querySelectorAll('[data-webme="service-card"]').forEach(function (el, index) {
            if (index >= 4) return;
            if (el.getAttribute("data-webme-image-slot")) return;
            if (el.querySelector('[data-webme^="service-image"]')) return;
            if (el.querySelector(".webme-photo-replace-overlay")) return;
            attachOverlay(el, "service-image-" + (index + 1), false);
          });

          if (!document.querySelector('[data-webme="logo"]')) {
            var logoTargets = document.querySelectorAll("header a, .logo-text, header .logo");
            logoTargets.forEach(function (el) {
              if (el.querySelector("img")) return;
              attachOverlay(el, "logo", true);
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

  const handleApplyPreset = useCallback(
    async (presetId: string) => {
      if (!presetId || applyingPresetId) {
        return;
      }

      setApplyingPresetId(presetId);
      setEditError(null);

      try {
        const response = await fetch("/api/leads/apply-preset-video", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            siteSlug: lead.site_slug,
            presetId,
            industry: lead.industry ?? undefined,
          }),
        });

        const data = (await response.json()) as {
          siteHtml?: string;
          error?: string;
        };

        if (!response.ok) {
          throw new Error(data.error ?? "Failed to apply preset video.");
        }

        if (data.siteHtml) {
          setSiteHtml(data.siteHtml);
        }

        setActivePresetId(presetId);
        setModal(null);
      } catch (error) {
        setEditError(
          error instanceof Error
            ? error.message
            : "Failed to apply preset video.",
        );
      } finally {
        setApplyingPresetId(null);
      }
    },
    [applyingPresetId, lead.industry, lead.site_slug],
  );

  const openPickPresetModal = useCallback(async () => {
    setActivePresetId(null);
    setModal("pick-preset");

    const currentUrl = extractScrollHeroVideoUrl(siteHtml);
    if (!currentUrl || !lead.industry) {
      return;
    }

    try {
      const response = await fetch(
        `/api/video-presets?industry=${encodeURIComponent(lead.industry)}`,
      );
      const data = (await response.json()) as {
        presets?: { id: string; video_url: string }[];
      };

      if (response.ok) {
        setActivePresetId(
          matchPresetIdFromVideoUrl(currentUrl, data.presets ?? []),
        );
      }
    } catch {
      // Best-effort match for the current hero video.
    }
  }, [lead.industry, siteHtml]);

  const handleApplySequence = useCallback(
    async (sequenceId: string) => {
      if (!sequenceId || applyingSequenceId) {
        return;
      }

      setApplyingSequenceId(sequenceId);
      setEditError(null);

      try {
        const response = await fetch("/api/leads/apply-preset-sequence", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            siteSlug: lead.site_slug,
            sequenceId,
            industry: lead.industry ?? undefined,
          }),
        });

        const data = (await response.json()) as {
          siteHtml?: string;
          error?: string;
        };

        if (!response.ok) {
          throw new Error(data.error ?? "Failed to apply image sequence.");
        }

        if (data.siteHtml) {
          setSiteHtml(data.siteHtml);
        }

        setScrollSequenceId(sequenceId);
        setActiveSequenceId(sequenceId);
        setModal(null);
      } catch (error) {
        setEditError(
          error instanceof Error
            ? error.message
            : "Failed to apply image sequence.",
        );
      } finally {
        setApplyingSequenceId(null);
      }
    },
    [applyingSequenceId, lead.industry, lead.site_slug],
  );

  const openPickSequenceModal = useCallback(async () => {
    setActiveSequenceId(null);
    setModal("pick-sequence");

    const currentSequenceId = scrollSequenceId;
    if (currentSequenceId) {
      setActiveSequenceId(currentSequenceId);
      return;
    }

    if (!lead.industry) {
      return;
    }

    try {
      const response = await fetch(
        `/api/image-sequences?industry=${encodeURIComponent(lead.industry)}`,
      );
      const data = (await response.json()) as {
        sequences?: { id: string; frames_urls: string[] }[];
      };

      if (response.ok && data.sequences?.length === 1) {
        setActiveSequenceId(data.sequences[0]!.id);
      }
    } catch {
      // Best-effort preselect for the picker.
    }
  }, [lead.industry, siteHtml]);

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
  }, [photoEditMode, siteHtml, replacingSlot]);

  useEffect(() => {
    const iframe = iframeRef.current;
    if (!iframe || scrollSequenceId) return;

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
  }, [siteHtml, shufflingVideo, scrollSequenceId]);

  useEffect(() => {
    function onMessage(event: MessageEvent) {
      const data = event.data as {
        type?: string;
        slot?: string;
        field?: keyof PreviewFields;
        value?: string;
      };
      if (
        (data?.type === "shuffle-photo" || data?.type === "replace-photo") &&
        typeof data.slot === "string"
      ) {
        void handleReplacePhoto(data.slot);
      }
      if (data?.type === "upload-photo" && typeof data.slot === "string") {
        pendingPhotoSlotRef.current = data.slot;
        photoInputRef.current?.click();
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
  const claimBuildPriceUsd = getLeadBuildPriceUsd(lead.site_metadata);
  const claimBuildPriceDisplay = formatSiteBuildPriceDisplay(claimBuildPriceUsd);
  const viewFullSiteHref = hasScrollSequence
    ? `/preview/${lead.site_slug}?mode=public`
    : `/site/${lead.site_slug}`;

  if (isPublicMode) {
    return (
      <div
        style={{
          minHeight: "100vh",
          height: "auto",
          maxHeight: "none",
          overflow: "visible",
          background: "#000",
        }}
      >
        {scrollSequenceId && (
          <ScrollHeroSequenceHero
            key={scrollSequenceId}
            sequenceId={scrollSequenceId}
            businessName={lead.business_name}
            posterUrl={sequenceHero?.posterUrl}
            headline={sequenceHero?.headline}
            tagline={sequenceHero?.tagline}
          />
        )}
        <SiteContentFrame html={siteHtml} title={lead.business_name} />
        <div style={{ position: "fixed", bottom: 0, left: 0, right: 0, zIndex: 9999, background: "#0f172a", borderTop: "1px solid rgba(255,255,255,0.1)", padding: "16px 24px", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
          <p style={{ color: "white", margin: 0, fontSize: "14px" }}>Like what you see? This site is yours.</p>
          <button
            onClick={() => {
              fetch("/api/stripe/checkout", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ slug: lead.site_slug }),
              })
                .then(async (r) => {
                  const data = (await r.json()) as {
                    url?: string;
                    error?: string;
                  };
                  if (data.url) {
                    window.location.href = data.url;
                    return;
                  }
                  alert(
                    data.error ??
                      `Checkout failed (${r.status}). Please contact support — do not retry until pricing is fixed.`,
                  );
                })
                .catch((e) => alert("Checkout error: " + e));
            }}
            style={{ background: "#22c55e", color: "white", border: "none", borderRadius: "8px", padding: "10px 20px", fontSize: "14px", fontWeight: "600", cursor: "pointer" }}
          >
            Claim This Site — {claimBuildPriceDisplay}
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="flex min-h-dvh flex-col overflow-visible bg-neutral-100">
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
        ref={photoInputRef}
        type="file"
        accept="image/png,image/jpeg,image/webp"
        className="hidden"
        onChange={(event) => {
          const slot = pendingPhotoSlotRef.current;
          pendingPhotoSlotRef.current = null;
          if (slot) {
            void handleUploadPhoto(slot, event.target.files?.[0] ?? null);
          }
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
                href={viewFullSiteHref}
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
            {hasScrollSequence ? (
              <button
                type="button"
                disabled={scrollVideoControlsDisabled}
                onClick={() => void openPickSequenceModal()}
                className="rounded-lg border border-neutral-600 px-4 py-2 text-sm font-medium text-white transition hover:border-neutral-400 hover:bg-neutral-800 disabled:cursor-not-allowed disabled:opacity-60"
              >
                {applyingSequenceId ? "Applying..." : "Pick Image Sequence"}
              </button>
            ) : hasScrollHero ? (
              <>
                <button
                  type="button"
                  disabled={scrollVideoControlsDisabled}
                  onClick={() => void handleShuffleVideo()}
                  className="rounded-lg border border-neutral-600 px-4 py-2 text-sm font-medium text-white transition hover:border-neutral-400 hover:bg-neutral-800 disabled:cursor-not-allowed disabled:opacity-60"
                >
                  {shufflingVideo ? "Shuffling..." : "Shuffle Video"}
                </button>
                <button
                  type="button"
                  disabled={scrollVideoControlsDisabled}
                  onClick={() => void openPickPresetModal()}
                  className="rounded-lg border border-neutral-600 px-4 py-2 text-sm font-medium text-white transition hover:border-neutral-400 hover:bg-neutral-800 disabled:cursor-not-allowed disabled:opacity-60"
                >
                  {applyingPresetId ? "Applying..." : "Pick Preset"}
                </button>
                <button
                  type="button"
                  disabled={scrollVideoControlsDisabled}
                  onClick={() => videoInputRef.current?.click()}
                  className="rounded-lg border border-neutral-600 px-4 py-2 text-sm font-medium text-white transition hover:border-neutral-400 hover:bg-neutral-800 disabled:cursor-not-allowed disabled:opacity-60"
                >
                  {uploadingVideo ? "Uploading..." : "Upload Custom Video"}
                </button>
              </>
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

      {scrollSequenceId ? (
        <div className="shrink-0">
          <ScrollHeroSequenceHero
            key={scrollSequenceId}
            sequenceId={scrollSequenceId}
            businessName={lead.business_name}
            posterUrl={heroOverlay?.posterUrl || lead.site_metadata?.heroImageUrl}
            headline={
              heroOverlay?.headline || fields.headline || lead.business_name
            }
            tagline={heroOverlay?.tagline || fields.tagline}
          />
        </div>
      ) : null}

      <iframe
        ref={iframeRef}
        title={`Website preview for ${lead.business_name}`}
        sandbox="allow-scripts allow-same-origin"
        className="min-h-[55vh] w-full flex-1 border-0 bg-white"
        srcDoc={siteHtml}
        onLoad={() => {
          injectTextEditors();
          if (!scrollSequenceId) {
            injectHeroVideoOverlay();
          }
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
            Launch {fields.businessName || lead.business_name} for{" "}
            {claimBuildPriceDisplay} + first month free, then{" "}
            {HOSTING_MONTHLY_FEE_DISPLAY} hosting.
          </p>

          <div className="mt-8">
            <PricingCard buildPriceDisplay={claimBuildPriceDisplay} />
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
              Claim your site
            </h2>
            <p className="mt-1 text-sm text-neutral-600">
              Launch {fields.businessName || lead.business_name} with WebMe for{" "}
              {claimBuildPriceDisplay} + first month free, then{" "}
              {HOSTING_MONTHLY_FEE_DISPLAY} hosting.
            </p>

            <div className="mt-6">
              <PricingCard buildPriceDisplay={claimBuildPriceDisplay} />
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
              Claim your site to keep editing — pay {claimBuildPriceDisplay} +
              first month free, then {HOSTING_MONTHLY_FEE_DISPLAY} hosting and
              make unlimited updates anytime.
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

      {modal === "pick-sequence" ? (
        <ModalBackdrop onClose={() => setModal(null)}>
          <div className="p-6 sm:p-8">
            <h2 className="text-xl font-semibold text-neutral-900">
              Pick an image sequence
            </h2>
            <p className="mt-1 text-sm text-neutral-600">
              {lead.industry
                ? `Choose an autoplay frame sequence from the ${lead.industry} library.`
                : "This site has no industry set, so sequences cannot be loaded."}
            </p>

            {lead.industry ? (
              <div className="mt-6">
                <PresetImageSequencePicker
                  industry={lead.industry}
                  selectedSequenceId={activeSequenceId}
                  onSelectedSequenceIdChange={(sequenceId) => {
                    if (sequenceId) {
                      void handleApplySequence(sequenceId);
                    }
                  }}
                  disabled={applyingSequenceId !== null}
                  enabled
                  showAutoSelect={false}
                  gridClassName="grid gap-3 sm:grid-cols-2"
                />
              </div>
            ) : null}

            {applyingSequenceId ? (
              <p className="mt-4 text-sm text-neutral-600">Applying sequence...</p>
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

      {modal === "pick-preset" ? (
        <ModalBackdrop onClose={() => setModal(null)}>
          <div className="p-6 sm:p-8">
            <h2 className="text-xl font-semibold text-neutral-900">
              Pick a preset video
            </h2>
            <p className="mt-1 text-sm text-neutral-600">
              {lead.industry
                ? `Choose a scroll hero video from the ${lead.industry} library. Preview with play — selection applies immediately.`
                : "This site has no industry set, so presets cannot be loaded."}
            </p>

            {lead.industry ? (
              <div className="mt-6">
                <PresetVideoPicker
                  industry={lead.industry}
                  selectedPresetId={activePresetId}
                  onSelectedPresetIdChange={(presetId) => {
                    if (presetId) {
                      void handleApplyPreset(presetId);
                    }
                  }}
                  disabled={applyingPresetId !== null}
                  enabled
                  showAutoSelect={false}
                  gridClassName="grid gap-3 sm:grid-cols-2"
                />
              </div>
            ) : null}

            {applyingPresetId ? (
              <p className="mt-4 text-sm text-neutral-600">Applying video...</p>
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
