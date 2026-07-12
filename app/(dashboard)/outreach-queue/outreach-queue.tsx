"use client";

import { useCallback, useEffect, useRef, useState } from "react";

import { DEFAULT_SECTIONS } from "@/lib/agents/site-options";
import {
  getScrollBuildOptions,
  submitBuildSiteRequest,
  type ScrollBuildOptions,
} from "@/lib/agents/scroll-build-options";

import { Panel, DataTable } from "../_components/dashboard-ui";
import { ScrollBuildOptionsField } from "../_components/scroll-build-options-field";
import { BuildProgressBar } from "./build-progress-bar";
import { RebuildSequenceModal } from "./rebuild-sequence-modal";
import {
  MAX_CONCURRENT_BUILDS,
  type BuildJobMode,
  type BuildJobState,
  computeBuildProgress,
  createActiveBuildJob,
  createQueuedBuildJob,
} from "./build-queue";

type QueuedBuildJob = {
  itemId: string;
  mode: BuildJobMode;
  scrollHeroSequencePresetId?: string;
};

type QueueItem = {
  id: string;
  business_name: string;
  city: string;
  industry: string | null;
  address: string | null;
  phone: string | null;
  site_slug: string | null;
  owner_email: string | null;
  status: string;
};

const inputClassName =
  "w-full rounded-lg border border-neutral-300 bg-white px-3 py-2 text-sm text-neutral-900 outline-none transition placeholder:text-neutral-400 focus:border-neutral-900 focus:ring-2 focus:ring-neutral-200";

export function OutreachQueue() {
  const [queue, setQueue] = useState<QueueItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [emails, setEmails] = useState<Record<string, string>>({});
  const [sending, setSending] = useState<Set<string>>(new Set());
  const [sendingAll, setSendingAll] = useState(false);
  const [buildJobs, setBuildJobs] = useState<Record<string, BuildJobState>>({});
  const [scrollBuildOptionsById, setScrollBuildOptionsById] = useState<
    Record<string, ScrollBuildOptions>
  >({});
  const scrollBuildOptionsRef = useRef<Record<string, ScrollBuildOptions>>({});
  const [findingEmailIds, setFindingEmailIds] = useState<Set<string>>(new Set());
  const [editingEmailIds, setEditingEmailIds] = useState<Set<string>>(new Set());
  const [savingEmailIds, setSavingEmailIds] = useState<Set<string>>(new Set());
  const [previewEmailComposerId, setPreviewEmailComposerId] = useState<
    string | null
  >(null);
  const [sendingPreviewEmailIds, setSendingPreviewEmailIds] = useState<
    Set<string>
  >(new Set());
  const [previewEmailSentIds, setPreviewEmailSentIds] = useState<Set<string>>(
    new Set(),
  );
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);
  const [rebuildModalItem, setRebuildModalItem] = useState<QueueItem | null>(
    null,
  );

  const buildQueueRef = useRef<QueuedBuildJob[]>([]);
  const activeBuildIdsRef = useRef<Set<string>>(new Set());
  const buildJobsRef = useRef<Record<string, BuildJobState>>({});
  const itemsByIdRef = useRef<Record<string, QueueItem>>({});
  const rebuildSequenceByItemRef = useRef<Record<string, string>>({});

  useEffect(() => {
    buildJobsRef.current = buildJobs;
  }, [buildJobs]);

  function setScrollOptionsForItem(itemId: string, next: ScrollBuildOptions) {
    scrollBuildOptionsRef.current[itemId] = next;
    setScrollBuildOptionsById((current) => ({ ...current, [itemId]: next }));
  }

  const loadQueue = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const response = await fetch("/api/outreach-queue");
      const data = (await response.json()) as {
        queue?: QueueItem[];
        error?: string;
      };
      if (!response.ok) throw new Error(data.error ?? "Failed to load queue.");
      const items = data.queue ?? [];
      setQueue(items);
      const initialEmails: Record<string, string> = {};
      const nextItemsById: Record<string, QueueItem> = {};
      for (const item of items) {
        initialEmails[item.id] = item.owner_email ?? "";
        nextItemsById[item.id] = item;
      }
      itemsByIdRef.current = nextItemsById;
      setEmails(initialEmails);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load queue.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadQueue();
  }, [loadQueue]);

  useEffect(() => {
    const interval = window.setInterval(() => {
      setBuildJobs((current) => {
        let changed = false;
        const next: Record<string, BuildJobState> = { ...current };

        for (const [id, job] of Object.entries(current)) {
          if (job.status !== "building" || !job.startedAt) {
            continue;
          }

          const computed = computeBuildProgress(job.startedAt);
          if (
            computed.progress !== job.progress ||
            computed.stageIndex !== job.stageIndex ||
            computed.stageLabel !== job.stageLabel
          ) {
            next[id] = {
              ...job,
              stageIndex: computed.stageIndex,
              progress: computed.progress,
              stageLabel: computed.stageLabel,
            };
            changed = true;
          }
        }

        return changed ? next : current;
      });
    }, 500);

    return () => window.clearInterval(interval);
  }, []);

  const releaseBuildSlot = useCallback((itemId: string, reason: string) => {
    console.log("[outreach-queue] releaseBuildSlot", { itemId, reason });
    activeBuildIdsRef.current.delete(itemId);
    setBuildJobs((current) => {
      if (!current[itemId]) {
        return current;
      }

      const next = { ...current };
      delete next[itemId];
      buildJobsRef.current = next;
      return next;
    });
  }, []);

  const runBuild = useCallback(async (itemId: string, mode: BuildJobMode) => {
    const item = itemsByIdRef.current[itemId];
    const scrollHeroSequencePresetId =
      rebuildSequenceByItemRef.current[itemId]?.trim() ?? "";
    if (!item) {
      console.error("[outreach-queue] runBuild aborted: item missing", {
        itemId,
        mode,
      });
      releaseBuildSlot(itemId, "missing-item");
      processBuildQueueRef.current();
      return;
    }

    if (mode === "build" && item.site_slug) {
      console.log("[outreach-queue] runBuild skipped: site already exists", {
        itemId,
        siteSlug: item.site_slug,
      });
      releaseBuildSlot(itemId, "site-already-exists");
      processBuildQueueRef.current();
      return;
    }

    if (mode === "rebuild" && !item.site_slug) {
      console.log("[outreach-queue] rebuild skipped: no site yet", { itemId });
      releaseBuildSlot(itemId, "no-site-to-rebuild");
      processBuildQueueRef.current();
      return;
    }

    console.log("[outreach-queue] runBuild starting", {
      itemId,
      mode,
      businessName: item.business_name,
    });

    try {
      if (mode === "rebuild") {
        if (!scrollHeroSequencePresetId) {
          throw new Error("An image sequence must be selected before rebuilding.");
        }

        const response = await fetch("/api/outreach-queue/rebuild", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            id: item.id,
            site_slug: item.site_slug,
            scrollHeroSequencePresetId,
          }),
        });

        const data = (await response.json()) as {
          siteSlug?: string;
          error?: string;
        };

        if (!response.ok || !data.siteSlug) {
          throw new Error(data.error ?? "Failed to rebuild site.");
        }

        console.log("[outreach-queue] rebuild completed", {
          itemId,
          siteSlug: data.siteSlug,
        });
        return;
      }

      const scroll = getScrollBuildOptions(scrollBuildOptionsRef.current, itemId);

      console.log("[outreach-queue] runBuild submitting request", {
        itemId,
        scrollAnimationEffect: scroll.scrollAnimationEffect,
        scrollHeroPresetId: scroll.scrollHeroPresetId,
        hasVideoFile: Boolean(scroll.scrollHeroVideoFile),
      });

      const response = await submitBuildSiteRequest(
        {
          businessName: item.business_name,
          city: item.city,
          industry: item.industry,
          paletteId: "midnight",
          styleId: "modern-minimal",
          sections: DEFAULT_SECTIONS,
          createLogoForMe: true,
        },
        scroll,
      );

      const data = (await response.json()) as {
        siteSlug?: string;
        error?: string;
      };

      console.log("[outreach-queue] runBuild response received", {
        itemId,
        ok: response.ok,
        status: response.status,
        siteSlug: data.siteSlug,
        error: data.error,
      });

      if (!response.ok || !data.siteSlug) {
        throw new Error(data.error ?? "Failed to build site.");
      }

      await fetch("/api/outreach-queue", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: item.id, site_slug: data.siteSlug }),
      });

      setQueue((current) =>
        current.map((entry) =>
          entry.id === item.id
            ? { ...entry, site_slug: data.siteSlug! }
            : entry,
        ),
      );

      itemsByIdRef.current[item.id] = {
        ...item,
        site_slug: data.siteSlug,
      };

      console.log("[outreach-queue] runBuild completed", {
        itemId,
        siteSlug: data.siteSlug,
      });
    } catch (err) {
      console.error("[outreach-queue] runBuild failed", { itemId, err });
      setActionError(
        err instanceof Error ? err.message : "Failed to build site.",
      );
    } finally {
      delete rebuildSequenceByItemRef.current[itemId];
      releaseBuildSlot(itemId, "finished");
      processBuildQueueRef.current();
    }
  }, [releaseBuildSlot]);

  const processBuildQueueRef = useRef<() => void>(() => {});

  processBuildQueueRef.current = () => {
    for (const activeId of [...activeBuildIdsRef.current]) {
      const job = buildJobsRef.current[activeId];
      if (!job || job.status !== "building") {
        console.warn("[outreach-queue] Releasing orphan active build slot", {
          activeId,
          jobStatus: job?.status,
        });
        activeBuildIdsRef.current.delete(activeId);
      }
    }

    console.log("[outreach-queue] processBuildQueue", {
      activeBuilds: activeBuildIdsRef.current.size,
      queuedIds: buildQueueRef.current.length,
      maxConcurrent: MAX_CONCURRENT_BUILDS,
    });

    while (
      activeBuildIdsRef.current.size < MAX_CONCURRENT_BUILDS &&
      buildQueueRef.current.length > 0
    ) {
      const queuedJob = buildQueueRef.current.shift();
      const itemId = queuedJob?.itemId;
      const mode = queuedJob?.mode ?? "build";

      if (!itemId || activeBuildIdsRef.current.has(itemId)) {
        console.log("[outreach-queue] processBuildQueue skipping queue entry", {
          itemId,
          reason: !itemId ? "empty-id" : "already-active",
        });
        continue;
      }

      const item = itemsByIdRef.current[itemId];
      if (!item || (mode === "build" && item.site_slug)) {
        console.log("[outreach-queue] processBuildQueue dropping stale job", {
          itemId,
          mode,
          hasItem: Boolean(item),
          siteSlug: item?.site_slug ?? null,
        });
        setBuildJobs((current) => {
          if (!current[itemId]) {
            return current;
          }

          const next = { ...current };
          delete next[itemId];
          return next;
        });
        continue;
      }

      if (mode === "rebuild" && !item.site_slug) {
        setBuildJobs((current) => {
          if (!current[itemId]) {
            return current;
          }

          const next = { ...current };
          delete next[itemId];
          return next;
        });
        continue;
      }

      activeBuildIdsRef.current.add(itemId);
      console.log("[outreach-queue] processBuildQueue starting build", {
        itemId,
        mode,
        activeBuilds: activeBuildIdsRef.current.size,
      });
      setBuildJobs((current) => {
        const next = {
          ...current,
          [itemId]: createActiveBuildJob(mode),
        };
        buildJobsRef.current = next;
        return next;
      });
      void runBuild(itemId, mode);
    }
  };

  function enqueueBuildJob(
    item: QueueItem,
    mode: BuildJobMode,
    options?: { scrollHeroSequencePresetId?: string },
  ) {
    console.log("[outreach-queue] enqueueBuildJob", {
      itemId: item.id,
      mode,
      businessName: item.business_name,
      siteSlug: item.site_slug,
      existingJob: buildJobsRef.current[item.id]?.status ?? null,
      activeBuilds: activeBuildIdsRef.current.size,
      queuedIds: buildQueueRef.current.length,
    });

    const latestItem = itemsByIdRef.current[item.id] ?? item;

    if (mode === "build" && latestItem.site_slug) {
      return;
    }

    if (mode === "rebuild" && !latestItem.site_slug) {
      return;
    }

    if (buildJobsRef.current[item.id]) {
      return;
    }

    setActionError(null);
    itemsByIdRef.current[item.id] = latestItem;

    const scrollHeroSequencePresetId =
      options?.scrollHeroSequencePresetId?.trim() ?? "";
    if (mode === "rebuild") {
      if (!scrollHeroSequencePresetId) {
        setActionError("Select an image sequence before rebuilding.");
        return;
      }
      rebuildSequenceByItemRef.current[item.id] = scrollHeroSequencePresetId;
    }

    const queuedJob = createQueuedBuildJob(mode);
    buildJobsRef.current = {
      ...buildJobsRef.current,
      [item.id]: queuedJob,
    };
    setBuildJobs(buildJobsRef.current);
    buildQueueRef.current.push({
      itemId: item.id,
      mode,
      scrollHeroSequencePresetId: scrollHeroSequencePresetId || undefined,
    });

    processBuildQueueRef.current();
  }

  function openRebuildModal(item: QueueItem) {
    setActionError(null);
    setRebuildModalItem(item);
  }

  function handleConfirmRebuild(sequenceId: string) {
    if (!rebuildModalItem) {
      return;
    }

    const latestItem =
      itemsByIdRef.current[rebuildModalItem.id] ?? rebuildModalItem;

    if (buildJobsRef.current[latestItem.id]) {
      setActionError("A rebuild is already in progress for this item.");
      return;
    }

    enqueueBuildJob(latestItem, "rebuild", {
      scrollHeroSequencePresetId: sequenceId,
    });
    setRebuildModalItem(null);
  }

  function enqueueBuildSite(item: QueueItem) {
    enqueueBuildJob(item, "build");
  }

  async function handleFindEmail(item: QueueItem) {
    setFindingEmailIds((current) => new Set(current).add(item.id));
    setActionError(null);

    try {
      const response = await fetch("/api/outreach-queue/find-email", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          id: item.id,
          businessName: item.business_name,
          city: item.city,
          phone: item.phone,
        }),
      });

      const data = (await response.json()) as {
        email?: string | null;
        error?: string;
      };

      if (!response.ok) {
        throw new Error(data.error ?? "Failed to find email.");
      }

      const email = data.email?.trim();
      if (email) {
        setEmails((current) => ({ ...current, [item.id]: email }));
        setQueue((current) =>
          current.map((entry) =>
            entry.id === item.id ? { ...entry, owner_email: email } : entry,
          ),
        );
        setSuccessMessage(`Email found: ${email}`);
      } else {
        setActionError(`No email found for ${item.business_name}.`);
      }
    } catch (err) {
      setActionError(
        err instanceof Error ? err.message : "Failed to find email.",
      );
    } finally {
      setFindingEmailIds((current) => {
        const next = new Set(current);
        next.delete(item.id);
        return next;
      });
    }
  }

  async function handleSaveEmail(item: QueueItem) {
    const email = emails[item.id]?.trim() ?? "";
    const savedEmail = item.owner_email?.trim() ?? "";

    if (email === savedEmail) {
      return;
    }

    setActionError(null);
    setSavingEmailIds((current) => new Set(current).add(item.id));

    try {
      const response = await fetch("/api/outreach-queue", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: item.id, owner_email: email }),
      });

      const data = (await response.json()) as { error?: string };

      if (!response.ok) {
        throw new Error(data.error ?? "Failed to save email.");
      }

      setQueue((current) =>
        current.map((entry) =>
          entry.id === item.id ? { ...entry, owner_email: email || null } : entry,
        ),
      );
      setEditingEmailIds((current) => {
        const next = new Set(current);
        next.delete(item.id);
        return next;
      });
    } catch (err) {
      setActionError(
        err instanceof Error ? err.message : "Failed to save email.",
      );
    } finally {
      setSavingEmailIds((current) => {
        const next = new Set(current);
        next.delete(item.id);
        return next;
      });
    }
  }

  function handleEditEmail(itemId: string) {
    setEditingEmailIds((current) => new Set(current).add(itemId));
  }

  async function sendOutreach(item: QueueItem) {
    const email = emails[item.id]?.trim();
    if (!email) {
      setActionError(`Please enter an email for ${item.business_name}.`);
      return;
    }
    setSending((current) => new Set(current).add(item.id));
    setActionError(null);
    try {
      await fetch("/api/outreach-queue", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: item.id, owner_email: email }),
      });
      const response = await fetch("/api/outreach/send-by-slug", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ siteSlug: item.site_slug, ownerEmail: email }),
      });
      const data = (await response.json()) as { error?: string };
      if (!response.ok) throw new Error(data.error ?? "Failed to send outreach.");
      await fetch("/api/outreach-queue", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: item.id, status: "sent" }),
      });
      setQueue((current) => current.filter((entry) => entry.id !== item.id));
      setSuccessMessage(`Outreach sent to ${item.business_name}.`);
    } catch (err) {
      setActionError(
        err instanceof Error ? err.message : "Failed to send outreach.",
      );
    } finally {
      setSending((current) => {
        const next = new Set(current);
        next.delete(item.id);
        return next;
      });
    }
  }

  function openPreviewEmailComposer(item: QueueItem) {
    setActionError(null);
    setEmails((current) => ({
      ...current,
      [item.id]: current[item.id] ?? item.owner_email ?? "",
    }));
    setPreviewEmailComposerId(item.id);
  }

  function resetPreviewEmailComposer(item: QueueItem) {
    setPreviewEmailSentIds((current) => {
      const next = new Set(current);
      next.delete(item.id);
      return next;
    });
    openPreviewEmailComposer(item);
  }

  async function sendPreviewEmail(item: QueueItem) {
    if (!item.site_slug) {
      setActionError(`No site built yet for ${item.business_name}.`);
      return;
    }

    const email = (emails[item.id] ?? item.owner_email ?? "").trim();
    if (!email) {
      setActionError(`Please enter an email for ${item.business_name}.`);
      return;
    }

    setSendingPreviewEmailIds((current) => new Set(current).add(item.id));
    setActionError(null);

    try {
      await fetch("/api/outreach-queue", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: item.id, owner_email: email }),
      });

      const response = await fetch("/api/business-search/send-preview-email", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          siteSlug: item.site_slug,
          ownerEmail: email,
        }),
      });

      const data = (await response.json()) as {
        error?: string;
        resendDiagnostics?: unknown;
      };
      if (!response.ok) {
        console.error("[outreach-queue] Preview email failed", data);
        throw new Error(data.error ?? "Failed to send preview email.");
      }

      setQueue((current) =>
        current.map((entry) =>
          entry.id === item.id
            ? { ...entry, owner_email: email, status: "outreach_sent" }
            : entry,
        ),
      );
      setPreviewEmailSentIds((current) => new Set(current).add(item.id));
      setPreviewEmailComposerId(null);
      setSuccessMessage(`Preview email sent to ${email}.`);
    } catch (err) {
      setActionError(
        err instanceof Error ? err.message : "Failed to send preview email.",
      );
    } finally {
      setSendingPreviewEmailIds((current) => {
        const next = new Set(current);
        next.delete(item.id);
        return next;
      });
    }
  }

  async function sendAll() {
    const withEmail = queue.filter((item) => emails[item.id]?.trim());
    if (withEmail.length === 0) {
      setActionError("Please enter at least one email address.");
      return;
    }
    setSendingAll(true);
    setActionError(null);
    for (const item of withEmail) {
      await sendOutreach(item);
    }
    setSendingAll(false);
    setSuccessMessage(`Outreach sent to ${withEmail.length} business(es).`);
  }

  async function removeFromQueue(id: string) {
    try {
      await fetch("/api/outreach-queue", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id, status: "removed" }),
      });
      setQueue((current) => current.filter((entry) => entry.id !== id));
      buildQueueRef.current = buildQueueRef.current.filter(
        (queuedJob) => queuedJob.itemId !== id,
      );
      activeBuildIdsRef.current.delete(id);
      setBuildJobs((current) => {
        if (!current[id]) {
          return current;
        }

        const next = { ...current };
        delete next[id];
        return next;
      });
    } catch {
      setActionError("Failed to remove from queue.");
    }
  }

  const activeBuildCount = Object.values(buildJobs).filter(
    (job) => job.status === "building",
  ).length;
  const queuedBuildCount = Object.values(buildJobs).filter(
    (job) => job.status === "queued",
  ).length;

  const rows = queue.map((item) => {
    const savedEmail = item.owner_email?.trim() ?? "";
    const draftEmail = emails[item.id] ?? "";
    const isEditing = editingEmailIds.has(item.id);
    const hasSavedEmail = savedEmail.length > 0;
    const isDirty = draftEmail.trim() !== savedEmail;
    const isReadOnly = hasSavedEmail && !isEditing;
    const isSavingEmail = savingEmailIds.has(item.id);
    const buildJob = buildJobs[item.id];
    const buildInProgress = Boolean(buildJob);

    return [
      <div key="business" className="space-y-1">
        <span className="block font-medium text-neutral-900">
          {item.business_name}
        </span>
        <span className="block text-xs text-neutral-500">
          {item.city} · {item.industry ?? "—"}
        </span>
      </div>,
      <span key="phone" className="text-sm text-neutral-600">
        {item.phone ?? "—"}
      </span>,
      item.site_slug ? (
        <a
          key="site"
          href={`/preview/${item.site_slug}`}
          target="_blank"
          rel="noopener noreferrer"
          className="text-sm font-medium text-neutral-700 hover:text-neutral-900"
        >
          View Site
        </a>
      ) : (
        <span key="site" className="text-sm text-neutral-400">
          No site
        </span>
      ),
      <div key="email" className="space-y-2">
        <input
          type="email"
          value={draftEmail}
          readOnly={isReadOnly}
          onChange={(event) =>
            setEmails((current) => ({
              ...current,
              [item.id]: event.target.value,
            }))
          }
          placeholder="owner@business.com"
          disabled={isSavingEmail}
          className={`${inputClassName} disabled:cursor-not-allowed disabled:opacity-60${
            isReadOnly ? " bg-neutral-50 text-neutral-700" : ""
          }`}
        />
        {isDirty ? (
          <button
            type="button"
            onClick={() => void handleSaveEmail(item)}
            disabled={
              isSavingEmail ||
              findingEmailIds.has(item.id) ||
              buildInProgress ||
              sending.has(item.id) ||
              sendingAll
            }
            className="rounded-lg border border-neutral-300 bg-white px-3 py-2 text-sm font-medium text-neutral-900 transition hover:bg-neutral-50 disabled:opacity-60"
          >
            {isSavingEmail ? "Saving..." : "Save Email"}
          </button>
        ) : null}
        {hasSavedEmail && !isEditing ? (
          <button
            type="button"
            onClick={() => handleEditEmail(item.id)}
            disabled={
              isSavingEmail ||
              findingEmailIds.has(item.id) ||
              buildInProgress ||
              sending.has(item.id) ||
              sendingAll
            }
            className="text-left text-sm font-medium text-neutral-700 hover:text-neutral-900 disabled:opacity-60"
          >
            Edit
          </button>
        ) : null}
        {!hasSavedEmail && !draftEmail.trim() ? (
          <button
            type="button"
            onClick={() => void handleFindEmail(item)}
            disabled={
              findingEmailIds.has(item.id) ||
              buildInProgress ||
              sending.has(item.id) ||
              sendingAll ||
              isSavingEmail
            }
            className="rounded-lg border border-neutral-300 bg-white px-3 py-2 text-sm font-medium text-neutral-900 transition hover:bg-neutral-50 disabled:opacity-60"
          >
            {findingEmailIds.has(item.id) ? "Finding..." : "Find Email"}
          </button>
        ) : null}
      </div>,
      <div key="actions" className="flex flex-col gap-2">
        {!item.site_slug && !buildInProgress ? (
          <button
            type="button"
            onClick={() => enqueueBuildSite(item)}
            disabled={sending.has(item.id) || sendingAll}
            className="rounded-lg bg-neutral-900 px-3 py-2 text-sm font-medium text-white transition hover:bg-neutral-800 disabled:opacity-60"
          >
            Build Site
          </button>
        ) : null}
        {item.site_slug ? (
          <>
            <button
              type="button"
              onClick={() => void sendOutreach(item)}
              disabled={
                sending.has(item.id) ||
                sendingAll ||
                buildInProgress ||
                sendingPreviewEmailIds.has(item.id)
              }
              className="rounded-lg bg-neutral-900 px-3 py-2 text-sm font-medium text-white transition hover:bg-neutral-800 disabled:opacity-60"
            >
              {sending.has(item.id) ? "Sending..." : "Send Outreach"}
            </button>
            {previewEmailSentIds.has(item.id) ? (
              <button
                type="button"
                onClick={() => resetPreviewEmailComposer(item)}
                disabled={
                  sending.has(item.id) ||
                  sendingAll ||
                  buildInProgress ||
                  sendingPreviewEmailIds.has(item.id)
                }
                className="rounded-lg border border-emerald-300 bg-emerald-50 px-3 py-2 text-sm font-medium text-emerald-900 transition hover:bg-emerald-100 disabled:opacity-60"
              >
                Send Again
              </button>
            ) : previewEmailComposerId === item.id ? (
              <div className="space-y-2 rounded-lg border border-neutral-200 bg-neutral-50 p-2">
                <input
                  type="email"
                  value={emails[item.id] ?? ""}
                  onChange={(event) =>
                    setEmails((current) => ({
                      ...current,
                      [item.id]: event.target.value,
                    }))
                  }
                  placeholder="owner@business.com"
                  disabled={sendingPreviewEmailIds.has(item.id)}
                  className={`${inputClassName} disabled:cursor-not-allowed disabled:opacity-60`}
                />
                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={() => void sendPreviewEmail(item)}
                    disabled={
                      sendingPreviewEmailIds.has(item.id) ||
                      buildInProgress ||
                      sending.has(item.id) ||
                      sendingAll
                    }
                    className="flex-1 rounded-lg bg-emerald-600 px-3 py-2 text-sm font-medium text-white transition hover:bg-emerald-500 disabled:opacity-60"
                  >
                    {sendingPreviewEmailIds.has(item.id) ? "Sending..." : "Send"}
                  </button>
                  <button
                    type="button"
                    onClick={() => setPreviewEmailComposerId(null)}
                    disabled={sendingPreviewEmailIds.has(item.id)}
                    className="rounded-lg border border-neutral-300 bg-white px-3 py-2 text-sm font-medium text-neutral-700 transition hover:bg-neutral-50 disabled:opacity-60"
                  >
                    Cancel
                  </button>
                </div>
              </div>
            ) : (
              <button
                type="button"
                onClick={() => openPreviewEmailComposer(item)}
                disabled={
                  sending.has(item.id) ||
                  sendingAll ||
                  buildInProgress ||
                  sendingPreviewEmailIds.has(item.id)
                }
                className="rounded-lg border border-emerald-300 bg-emerald-50 px-3 py-2 text-sm font-medium text-emerald-900 transition hover:bg-emerald-100 disabled:opacity-60"
              >
                Send Preview Email
              </button>
            )}
            {!buildInProgress ? (
              <button
                type="button"
                onClick={() => openRebuildModal(item)}
                disabled={
                  sending.has(item.id) ||
                  sendingAll ||
                  sendingPreviewEmailIds.has(item.id)
                }
                className="rounded-lg border border-neutral-300 bg-white px-3 py-2 text-sm font-medium text-neutral-900 transition hover:bg-neutral-50 disabled:opacity-60"
              >
                Rebuild
              </button>
            ) : null}
          </>
        ) : null}
        <button
          type="button"
          onClick={() => void removeFromQueue(item.id)}
          disabled={buildInProgress}
          className="text-left text-sm font-medium text-red-600 hover:text-red-700 disabled:opacity-60"
        >
          Remove
        </button>
      </div>,
    ];
  });

  const rowFooters = queue.map((item) => {
    const buildJob = buildJobs[item.id];

    if (buildJob && (!item.site_slug || buildJob.mode === "rebuild")) {
      return (
        <BuildProgressBar
          label={
            buildJob.mode === "rebuild"
              ? `Rebuilding — ${buildJob.stageLabel}`
              : buildJob.stageLabel
          }
          progress={buildJob.progress}
          queued={buildJob.status === "queued"}
        />
      );
    }

    if (!item.site_slug && !buildJob) {
      return (
        <ScrollBuildOptionsField
          options={getScrollBuildOptions(scrollBuildOptionsById, item.id)}
          onChange={(next) => setScrollOptionsForItem(item.id, next)}
          industry={item.industry ?? undefined}
          disabled={sending.has(item.id) || sendingAll}
        />
      );
    }

    return null;
  });

  return (
    <div className="space-y-6">
      {successMessage ? (
        <div className="rounded-lg border border-emerald-200 bg-emerald-50 px-4 py-3">
          <p className="text-sm font-medium text-emerald-800">{successMessage}</p>
        </div>
      ) : null}
      {actionError ? (
        <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3">
          <p className="text-sm font-medium text-red-800">{actionError}</p>
        </div>
      ) : null}
      <Panel
        title="Outreach Queue"
        subtitle={
          loading
            ? "Loading..."
            : `${queue.length} business(es) pending outreach${
                activeBuildCount + queuedBuildCount > 0
                  ? ` · ${activeBuildCount} building, ${queuedBuildCount} queued (max ${MAX_CONCURRENT_BUILDS} at once)`
                  : ""
              }`
        }
      >
        {queue.length > 0 ? (
          <div className="border-b border-neutral-200 px-5 py-4 flex justify-end">
            <button
              type="button"
              onClick={() => void sendAll()}
              disabled={sendingAll}
              className="rounded-lg bg-neutral-900 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-neutral-800 disabled:opacity-60"
            >
              {sendingAll
                ? "Sending All..."
                : `Send All (${queue.filter((entry) => emails[entry.id]?.trim()).length} with email)`}
            </button>
          </div>
        ) : null}
        {queue.length > 0 ? (
          <DataTable
            columns={["Business", "Phone", "Site", "Contact Email", "Actions"]}
            rows={rows}
            rowFooters={rowFooters}
          />
        ) : (
          <div className="px-5 py-10 text-sm text-neutral-500">
            {loading
              ? "Loading..."
              : "No businesses in the queue. Add some from the Leads page."}
          </div>
        )}
      </Panel>
      {rebuildModalItem ? (
        <RebuildSequenceModal
          businessName={rebuildModalItem.business_name}
          industry={rebuildModalItem.industry}
          onCancel={() => setRebuildModalItem(null)}
          onConfirm={handleConfirmRebuild}
        />
      ) : null}
    </div>
  );
}
