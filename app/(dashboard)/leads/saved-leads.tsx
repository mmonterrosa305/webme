"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useState } from "react";

import { DataTable, Panel } from "../_components/dashboard-ui";
import { DEFAULT_SECTIONS } from "@/lib/agents/site-options";
import type { LeadStatus, SavedLead } from "@/lib/leads/types";

const STATUS_STYLES: Record<
  LeadStatus,
  { label: string; className: string }
> = {
  new: {
    label: "New",
    className: "bg-neutral-100 text-neutral-700 border-neutral-200",
  },
  pending_review: {
    label: "Pending Review",
    className: "bg-amber-50 text-amber-800 border-amber-200",
  },
  site_built: {
    label: "Pending Review",
    className: "bg-amber-50 text-amber-800 border-amber-200",
  },
  approved: {
    label: "Approved",
    className: "bg-emerald-50 text-emerald-700 border-emerald-200",
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

function hasBuiltSite(lead: SavedLead): boolean {
  return Boolean(lead.site_slug);
}

function isPendingReview(lead: SavedLead): boolean {
  return (
    hasBuiltSite(lead) &&
    (lead.status === "pending_review" || lead.status === "site_built")
  );
}

function isApproved(lead: SavedLead): boolean {
  return lead.status === "approved";
}

function LeadStatusBadge({ status, lead }: { status: string | null; lead: SavedLead }) {
  if (isPendingReview(lead)) {
    return (
      <span className="inline-flex rounded-full border border-amber-200 bg-amber-50 px-2.5 py-0.5 text-xs font-medium text-amber-800">
        Pending Review
      </span>
    );
  }

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
  const [regeneratingIds, setRegeneratingIds] = useState<Set<string>>(new Set());

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

  useEffect(() => {
    function handleLeadsSaved() {
      void loadLeads();
    }

    window.addEventListener("webme:leads-saved", handleLeadsSaved);
    return () => {
      window.removeEventListener("webme:leads-saved", handleLeadsSaved);
    };
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

  function setRegenerating(id: string, regenerating: boolean) {
    setRegeneratingIds((current) => {
      const next = new Set(current);
      if (regenerating) {
        next.add(id);
      } else {
        next.delete(id);
      }
      return next;
    });
  }

  async function patchLead(
    id: string,
    action: "approved" | "outreach_sent",
  ): Promise<SavedLead> {
    const response = await fetch("/api/leads/saved", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id, action }),
    });
    const data = (await response.json()) as {
      lead?: SavedLead;
      error?: string;
    };

    if (!response.ok || !data.lead) {
      throw new Error(data.error ?? "Failed to update lead.");
    }

    return data.lead;
  }

  async function handleApprove(lead: SavedLead) {
    setActionError(null);
    setPending(lead.id, true);

    try {
      const updated = await patchLead(lead.id, "approved");
      setLeads((current) =>
        current.map((item) => (item.id === lead.id ? updated : item)),
      );
    } catch (approveError) {
      setActionError(
        approveError instanceof Error
          ? approveError.message
          : "Failed to approve lead.",
      );
    } finally {
      setPending(lead.id, false);
    }
  }

  async function handleRegenerate(lead: SavedLead) {
    if (!lead.industry) {
      setActionError("This lead is missing an industry and cannot be regenerated.");
      return;
    }

    setActionError(null);
    setRegenerating(lead.id, true);

    try {
      const response = await fetch("/api/agents/build-site", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          businessName: lead.business_name,
          city: lead.city,
          industry: lead.industry,
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

      if (!response.ok) {
        throw new Error(data.error ?? "Failed to regenerate site.");
      }

      await loadLeads();
    } catch (regenerateError) {
      setActionError(
        regenerateError instanceof Error
          ? regenerateError.message
          : "Failed to regenerate site.",
      );
    } finally {
      setRegenerating(lead.id, false);
    }
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
      const updated = await patchLead(lead.id, "outreach_sent");
      setLeads((current) =>
        current.map((item) => (item.id === lead.id ? updated : item)),
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
        const isActionPending = pendingIds.has(lead.id);
        const isRegenerating = regeneratingIds.has(lead.id);
        const showSiteActions = hasBuiltSite(lead);
        const showReviewActions = isPendingReview(lead);
        const showOutreach = isApproved(lead) && hasBuiltSite(lead);

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
          <LeadStatusBadge key="status" status={lead.status} lead={lead} />,
          <div key="actions" className="flex flex-col gap-2">
            {isRegenerating ? (
              <span className="flex items-center gap-2 text-sm text-neutral-600">
                <span
                  className="inline-block h-4 w-4 animate-spin rounded-full border-2 border-neutral-300 border-t-neutral-900"
                  aria-hidden
                />
                Regenerating...
              </span>
            ) : null}
            {showSiteActions && lead.site_slug ? (
              <Link
                href={`/preview/${lead.site_slug}`}
                target="_blank"
                rel="noopener noreferrer"
                className="text-sm font-medium text-neutral-700 hover:text-neutral-900"
              >
                View Site
              </Link>
            ) : null}
            {showReviewActions ? (
              <>
                <button
                  type="button"
                  disabled={isActionPending || isRegenerating}
                  onClick={() => handleApprove(lead)}
                  className="text-left text-sm font-medium text-emerald-700 hover:text-emerald-800 disabled:cursor-not-allowed disabled:opacity-60"
                >
                  {isActionPending ? "Saving..." : "Approve"}
                </button>
                <button
                  type="button"
                  disabled={isActionPending || isRegenerating}
                  onClick={() => handleRegenerate(lead)}
                  className="text-left text-sm font-medium text-blue-700 hover:text-blue-800 disabled:cursor-not-allowed disabled:opacity-60"
                >
                  Regenerate
                </button>
              </>
            ) : null}
            {showOutreach ? (
              <button
                type="button"
                disabled={isActionPending || isRegenerating}
                onClick={() => handleSendOutreach(lead)}
                className="text-left text-sm font-medium text-neutral-700 hover:text-neutral-900 disabled:cursor-not-allowed disabled:opacity-60"
              >
                {isActionPending ? "Saving..." : "Send Outreach"}
              </button>
            ) : null}
            <button
              type="button"
              disabled={isActionPending || isRegenerating}
              onClick={() => handleDelete(lead.id)}
              className="text-left text-sm font-medium text-red-600 hover:text-red-700 disabled:cursor-not-allowed disabled:opacity-60"
            >
              Delete
            </button>
          </div>,
        ];
      }),
    [leads, pendingIds, regeneratingIds],
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
