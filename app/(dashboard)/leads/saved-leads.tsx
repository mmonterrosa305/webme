"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useState } from "react";

import { DataTable, Panel } from "../_components/dashboard-ui";
import type { LeadStatus, SavedLead } from "@/lib/leads/types";

const STATUS_STYLES: Record<
  LeadStatus,
  { label: string; className: string }
> = {
  new: {
    label: "New",
    className: "bg-neutral-100 text-neutral-700 border-neutral-200",
  },
  site_built: {
    label: "Site built",
    className: "bg-purple-50 text-purple-700 border-purple-200",
  },
  outreach_sent: {
    label: "Outreach sent",
    className: "bg-blue-50 text-blue-700 border-blue-200",
  },
  won: {
    label: "Won",
    className: "bg-emerald-50 text-emerald-700 border-emerald-200",
  },
  lost: {
    label: "Lost",
    className: "bg-red-50 text-red-700 border-red-200",
  },
};

function LeadStatusBadge({ status }: { status: string | null }) {
  const key = (status ?? "new") as LeadStatus;
  const config = STATUS_STYLES[key] ?? {
    label: status ?? "Unknown",
    className: "bg-neutral-100 text-neutral-700 border-neutral-200",
  };

  return (
    <span
      className={`inline-flex rounded-full border px-2.5 py-0.5 text-xs font-medium ${config.className}`}
    >
      {config.label}
    </span>
  );
}

export function SavedLeads() {
  const [leads, setLeads] = useState<SavedLead[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);
  const [pendingIds, setPendingIds] = useState<Set<string>>(new Set());

  const loadLeads = useCallback(async () => {
    setLoading(true);
    setError(null);

    try {
      const response = await fetch("/api/leads/saved");
      const data = (await response.json()) as {
        leads?: SavedLead[];
        error?: string;
      };

      if (!response.ok) {
        throw new Error(data.error ?? "Failed to load saved leads.");
      }

      setLeads(data.leads ?? []);
    } catch (loadError) {
      setError(
        loadError instanceof Error
          ? loadError.message
          : "Failed to load saved leads.",
      );
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadLeads();
  }, [loadLeads]);

  function setPending(id: string, pending: boolean) {
    setPendingIds((current) => {
      const next = new Set(current);
      if (pending) {
        next.add(id);
      } else {
        next.delete(id);
      }
      return next;
    });
  }

  async function handleDelete(id: string) {
    if (!window.confirm("Delete this saved lead?")) {
      return;
    }

    setActionError(null);
    setPending(id, true);

    try {
      const response = await fetch(`/api/leads/saved?id=${encodeURIComponent(id)}`, {
        method: "DELETE",
      });
      const data = (await response.json()) as { error?: string };

      if (!response.ok) {
        throw new Error(data.error ?? "Failed to delete lead.");
      }

      setLeads((current) => current.filter((lead) => lead.id !== id));
    } catch (deleteError) {
      setActionError(
        deleteError instanceof Error
          ? deleteError.message
          : "Failed to delete lead.",
      );
    } finally {
      setPending(id, false);
    }
  }

  async function handleSendOutreach(lead: SavedLead) {
    setActionError(null);
    setPending(lead.id, true);

    try {
      const response = await fetch("/api/leads/saved", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: lead.id, action: "outreach_sent" }),
      });
      const data = (await response.json()) as {
        lead?: SavedLead;
        error?: string;
      };

      if (!response.ok || !data.lead) {
        throw new Error(data.error ?? "Failed to mark outreach sent.");
      }

      setLeads((current) =>
        current.map((item) => (item.id === lead.id ? data.lead! : item)),
      );
    } catch (outreachError) {
      setActionError(
        outreachError instanceof Error
          ? outreachError.message
          : "Failed to mark outreach sent.",
      );
    } finally {
      setPending(lead.id, false);
    }
  }

  const rows = useMemo(
    () =>
      leads.map((lead) => {
        const isPending = pendingIds.has(lead.id);
        const canViewSite = lead.status === "site_built" && lead.site_slug;
        const showOutreach = lead.status === "site_built" && lead.site_slug;

        return [
          <span key="business" className="font-medium text-neutral-900">
            {lead.business_name}
          </span>,
          <span key="city" className="text-neutral-600">
            {lead.city}
          </span>,
          <span key="industry" className="text-neutral-600">
            {lead.industry ?? "—"}
          </span>,
          <LeadStatusBadge key="status" status={lead.status} />,
          <div key="actions" className="flex flex-col gap-2">
            {canViewSite && lead.site_slug ? (
              <Link
                href={`/preview/${lead.site_slug}`}
                target="_blank"
                rel="noopener noreferrer"
                className="text-sm font-medium text-neutral-700 hover:text-neutral-900"
              >
                View Site
              </Link>
            ) : null}
            {showOutreach ? (
              <button
                type="button"
                disabled={isPending}
                onClick={() => handleSendOutreach(lead)}
                className="text-left text-sm font-medium text-neutral-700 hover:text-neutral-900 disabled:cursor-not-allowed disabled:opacity-60"
              >
                {isPending ? "Saving..." : "Send Outreach"}
              </button>
            ) : null}
            <button
              type="button"
              disabled={isPending}
              onClick={() => handleDelete(lead.id)}
              className="text-left text-sm font-medium text-red-600 hover:text-red-700 disabled:cursor-not-allowed disabled:opacity-60"
            >
              Delete
            </button>
          </div>,
        ];
      }),
    [leads, pendingIds],
  );

  return (
    <Panel
      title="Saved leads"
      subtitle={
        loading
          ? "Loading saved leads..."
          : `${leads.length} leads in Supabase`
      }
    >
      {error ? (
        <p className="px-5 py-5 text-sm text-red-600" role="alert">
          {error}
        </p>
      ) : null}
      {actionError ? (
        <p className="px-5 pb-5 text-sm text-red-600" role="alert">
          {actionError}
        </p>
      ) : null}
      {!loading && leads.length > 0 ? (
        <DataTable
          columns={["Business", "City", "Industry", "Status", "Actions"]}
          rows={rows}
        />
      ) : (
        <div className="px-5 py-10 text-sm text-neutral-500">
          {loading
            ? "Loading..."
            : "No saved leads yet. Run a search to save prospects to Supabase."}
        </div>
      )}
    </Panel>
  );
}
