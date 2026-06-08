"use client";
import { useCallback, useEffect, useState } from "react";
import { DEFAULT_SECTIONS } from "@/lib/agents/site-options";
import { Panel, DataTable } from "../_components/dashboard-ui";

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
  const [buildingIds, setBuildingIds] = useState<Set<string>>(new Set());
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);

  const loadQueue = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const response = await fetch("/api/outreach-queue");
      const data = await response.json() as { queue?: QueueItem[]; error?: string };
      if (!response.ok) throw new Error(data.error ?? "Failed to load queue.");
      const items = data.queue ?? [];
      setQueue(items);
      const initialEmails: Record<string, string> = {};
      for (const item of items) {
        initialEmails[item.id] = item.owner_email ?? "";
      }
      setEmails(initialEmails);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load queue.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { void loadQueue(); }, [loadQueue]);

  async function handleBuildSite(item: QueueItem) {
    setBuildingIds((current) => new Set(current).add(item.id));
    setActionError(null);

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
        current.map((q) =>
          q.id === item.id ? { ...q, site_slug: data.siteSlug! } : q,
        ),
      );
    } catch (err) {
      setActionError(
        err instanceof Error ? err.message : "Failed to build site.",
      );
    } finally {
      setBuildingIds((current) => {
        const next = new Set(current);
        next.delete(item.id);
        return next;
      });
    }
  }

  async function sendOutreach(item: QueueItem) {
    const email = emails[item.id]?.trim();
    if (!email) {
      setActionError(`Please enter an email for ${item.business_name}.`);
      return;
    }
    setSending(current => new Set(current).add(item.id));
    setActionError(null);
    try {
      // Save email first
      await fetch("/api/outreach-queue", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: item.id, owner_email: email }),
      });
      // Find lead by site_slug and send outreach
      const response = await fetch("/api/outreach/send-by-slug", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ siteSlug: item.site_slug, ownerEmail: email }),
      });
      const data = await response.json() as { error?: string };
      if (!response.ok) throw new Error(data.error ?? "Failed to send outreach.");
      // Mark as sent
      await fetch("/api/outreach-queue", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: item.id, status: "sent" }),
      });
      setQueue(current => current.filter(q => q.id !== item.id));
      setSuccessMessage(`Outreach sent to ${item.business_name}.`);
    } catch (err) {
      setActionError(err instanceof Error ? err.message : "Failed to send outreach.");
    } finally {
      setSending(current => { const next = new Set(current); next.delete(item.id); return next; });
    }
  }

  async function sendAll() {
    const withEmail = queue.filter(item => emails[item.id]?.trim());
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
      setQueue(current => current.filter(q => q.id !== id));
    } catch {
      setActionError("Failed to remove from queue.");
    }
  }

  const rows = queue.map(item => [
    <div key="business" className="space-y-1">
      <span className="block font-medium text-neutral-900">{item.business_name}</span>
      <span className="block text-xs text-neutral-500">{item.city} · {item.industry ?? "—"}</span>
    </div>,
    <span key="phone" className="text-sm text-neutral-600">{item.phone ?? "—"}</span>,
    item.site_slug ? (
      <a key="site" href={`/preview/${item.site_slug}`} target="_blank" rel="noopener noreferrer"
        className="text-sm font-medium text-neutral-700 hover:text-neutral-900">
        View Site
      </a>
    ) : <span key="site" className="text-sm text-neutral-400">No site</span>,
    <input
      key="email"
      value={emails[item.id] ?? ""}
      onChange={e => setEmails(current => ({ ...current, [item.id]: e.target.value }))}
      placeholder="owner@business.com"
      className={inputClassName}
    />,
    <div key="actions" className="flex flex-col gap-2">
      {!item.site_slug ? (
        <button
          type="button"
          onClick={() => void handleBuildSite(item)}
          disabled={
            buildingIds.has(item.id) || sending.has(item.id) || sendingAll
          }
          className="rounded-lg bg-neutral-900 px-3 py-2 text-sm font-medium text-white transition hover:bg-neutral-800 disabled:opacity-60"
        >
          {buildingIds.has(item.id) ? "Building..." : "Build Site"}
        </button>
      ) : null}
      <button type="button" onClick={() => void sendOutreach(item)}
        disabled={sending.has(item.id) || sendingAll}
        className="rounded-lg bg-neutral-900 px-3 py-2 text-sm font-medium text-white transition hover:bg-neutral-800 disabled:opacity-60">
        {sending.has(item.id) ? "Sending..." : "Send Outreach"}
      </button>
      <button type="button" onClick={() => void removeFromQueue(item.id)}
        className="text-left text-sm font-medium text-red-600 hover:text-red-700">
        Remove
      </button>
    </div>,
  ]);

  return (
    <div className="space-y-6">
      {successMessage && (
        <div className="rounded-lg border border-emerald-200 bg-emerald-50 px-4 py-3">
          <p className="text-sm font-medium text-emerald-800">{successMessage}</p>
        </div>
      )}
      {actionError && (
        <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3">
          <p className="text-sm font-medium text-red-800">{actionError}</p>
        </div>
      )}
      <Panel
        title="Outreach Queue"
        subtitle={loading ? "Loading..." : `${queue.length} business(es) pending outreach`}
      >
        {queue.length > 0 && (
          <div className="border-b border-neutral-200 px-5 py-4 flex justify-end">
            <button type="button" onClick={() => void sendAll()} disabled={sendingAll}
              className="rounded-lg bg-neutral-900 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-neutral-800 disabled:opacity-60">
              {sendingAll ? "Sending All..." : `Send All (${queue.filter(i => emails[i.id]?.trim()).length} with email)`}
            </button>
          </div>
        )}
        {queue.length > 0 ? (
          <DataTable
            columns={["Business", "Phone", "Site", "Contact Email", "Actions"]}
            rows={rows}
          />
        ) : (
          <div className="px-5 py-10 text-sm text-neutral-500">
            {loading ? "Loading..." : "No businesses in the queue. Add some from the Leads page."}
          </div>
        )}
      </Panel>
    </div>
  );
}
