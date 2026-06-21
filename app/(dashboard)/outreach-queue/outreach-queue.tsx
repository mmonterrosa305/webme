"use client";

import { useCallback, useEffect, useRef, useState } from "react";

import { DEFAULT_SECTIONS } from "@/lib/agents/site-options";

import { Panel, DataTable } from "../_components/dashboard-ui";
import { BuildProgressBar } from "./build-progress-bar";
import {
  MAX_CONCURRENT_BUILDS,
  type BuildJobState,
  computeBuildProgress,
  createActiveBuildJob,
  createQueuedBuildJob,
} from "./build-queue";

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
  const [findingEmailIds, setFindingEmailIds] = useState<Set<string>>(new Set());
  const [editingEmailIds, setEditingEmailIds] = useState<Set<string>>(new Set());
  const [savingEmailIds, setSavingEmailIds] = useState<Set<string>>(new Set());
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);

  const buildQueueRef = useRef<string[]>([]);
  const activeBuildIdsRef = useRef<Set<string>>(new Set());
  const itemsByIdRef = useRef<Record<string, QueueItem>>({});

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

  const runBuild = useCallback(async (itemId: string) => {
    const item = itemsByIdRef.current[itemId];
    if (!item) {
      return;
    }

    try {
      const response = await fetch("/api/agents/build-site", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          businessName: item.business_name,
          city: item.city,
          industry: item.industry,
          paletteId: "midnight",
          styleId: "modern-minimal",
          sections: DEFAULT_SECTIONS,
          createLogoForMe: true,
        }),
      });

      const data = (await response.json()) as {
        siteSlug?: string;
        error?: string;
      };

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
    } catch (err) {
      setActionError(
        err instanceof Error ? err.message : "Failed to build site.",
      );
    } finally {
      activeBuildIdsRef.current.delete(itemId);
      setBuildJobs((current) => {
        if (!current[itemId]) {
          return current;
        }

        const next = { ...current };
        delete next[itemId];
        return next;
      });
      processBuildQueueRef.current();
    }
  }, []);

  const processBuildQueueRef = useRef<() => void>(() => {});

  processBuildQueueRef.current = () => {
    while (
      activeBuildIdsRef.current.size < MAX_CONCURRENT_BUILDS &&
      buildQueueRef.current.length > 0
    ) {
      const itemId = buildQueueRef.current.shift();
      if (!itemId || activeBuildIdsRef.current.has(itemId)) {
        continue;
      }

      const item = itemsByIdRef.current[itemId];
      if (!item || item.site_slug) {
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
      setBuildJobs((current) => ({
        ...current,
        [itemId]: createActiveBuildJob(),
      }));
      void runBuild(itemId);
    }
  };

  function enqueueBuildSite(item: QueueItem) {
    if (item.site_slug) {
      return;
    }

    let shouldEnqueue = false;

    setBuildJobs((current) => {
      if (current[item.id]) {
        return current;
      }

      shouldEnqueue = true;
      return {
        ...current,
        [item.id]: createQueuedBuildJob(),
      };
    });

    if (!shouldEnqueue) {
      return;
    }

    setActionError(null);
    itemsByIdRef.current[item.id] = item;
    buildQueueRef.current.push(item.id);
    processBuildQueueRef.current();
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
        (queuedId) => queuedId !== id,
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
          <button
            type="button"
            onClick={() => void sendOutreach(item)}
            disabled={sending.has(item.id) || sendingAll}
            className="rounded-lg bg-neutral-900 px-3 py-2 text-sm font-medium text-white transition hover:bg-neutral-800 disabled:opacity-60"
          >
            {sending.has(item.id) ? "Sending..." : "Send Outreach"}
          </button>
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
    if (!buildJob || item.site_slug) {
      return null;
    }

    return (
      <BuildProgressBar
        label={buildJob.stageLabel}
        progress={buildJob.progress}
        queued={buildJob.status === "queued"}
      />
    );
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
    </div>
  );
}
