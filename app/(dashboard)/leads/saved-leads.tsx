"use client";

import Link from "next/link";
import { useCallback, useEffect, useState } from "react";

import { DataTable, Panel } from "../_components/dashboard-ui";
import { COLOR_PALETTES, DEFAULT_SECTIONS, DESIGN_STYLES } from "@/lib/agents/site-options";
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
  return lead.status === "pending_review" || lead.status === "site_built";
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
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [pendingIds, setPendingIds] = useState<Set<string>>(new Set());
  const [regeneratingIds, setRegeneratingIds] = useState<Set<string>>(new Set());
  const [editingEmail, setEditingEmail] = useState<Record<string, string>>({});
  const [savingEmail, setSavingEmail] = useState<Set<string>>(new Set());

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

  function setSavingEmailId(id: string, saving: boolean) {
    setSavingEmail((current) => {
      const next = new Set(current);
      if (saving) {
        next.add(id);
      } else {
        next.delete(id);
      }
      return next;
    });
  }

  async function handleSaveEmail(lead: SavedLead, email: string) {
    setActionError(null);
    setSavingEmailId(lead.id, true);

    try {
      const response = await fetch("/api/leads/saved", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          id: lead.id,
          action: "update_email",
          email,
        }),
      });
      const data = (await response.json()) as {
        lead?: SavedLead;
        error?: string;
      };

      if (!response.ok || !data.lead) {
        throw new Error(data.error ?? "Failed to save email.");
      }

      setLeads((current) =>
        current.map((item) =>
          item.id === lead.id
            ? { ...data.lead!, regenerate_count: item.regenerate_count }
            : item,
        ),
      );
      setEditingEmail((current) => {
        const next = { ...current };
        delete next[lead.id];
        return next;
      });
    } catch (saveError) {
      setActionError(
        saveError instanceof Error
          ? saveError.message
          : "Failed to save email.",
      );
    } finally {
      setSavingEmailId(lead.id, false);
    }
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
    setSuccessMessage(null);
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

  async function handleAddToQueue(lead: SavedLead) {
    setActionError(null);
    setSuccessMessage(null);
    setPending(lead.id, true);

    try {
      const siteSlug = lead.site_slug?.trim() || null;

      console.log("[saved-leads] Add to Queue", {
        leadId: lead.id,
        businessName: lead.business_name,
        siteSlug,
      });

      const response = await fetch("/api/outreach-queue", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          leads: [
            {
              businessName: lead.business_name,
              city: lead.city,
              industry: lead.industry,
              address: null,
              phone: null,
              siteSlug,
              leadId: lead.id,
            },
          ],
        }),
      });

      const data = (await response.json()) as { error?: string };

      if (!response.ok) {
        throw new Error(data.error ?? "Failed to add to Outreach Queue.");
      }

      setSuccessMessage("Added to Outreach Queue");
    } catch (queueError) {
      setActionError(
        queueError instanceof Error
          ? queueError.message
          : "Failed to add to Outreach Queue.",
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
    setSuccessMessage(null);
    setRegenerating(lead.id, true);

    try {
      const randomPalette =
        COLOR_PALETTES[Math.floor(Math.random() * COLOR_PALETTES.length)];
      const randomStyle =
        DESIGN_STYLES[Math.floor(Math.random() * DESIGN_STYLES.length)];

      const response = await fetch("/api/agents/build-site", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          businessName: lead.business_name,
          city: lead.city,
          industry: lead.industry,
          paletteId: randomPalette.id,
          styleId: randomStyle.id,
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
      setSuccessMessage(`Site regenerated for ${lead.business_name}.`);
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
    setSuccessMessage(null);
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
    console.log("[SavedLeads] Send Outreach clicked", {
      leadId: lead.id,
      businessName: lead.business_name,
      status: lead.status,
      siteSlug: lead.site_slug,
    });

    setActionError(null);
    setSuccessMessage(null);
    setPending(lead.id, true);

    try {
      const response = await fetch("/api/outreach/send", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ leadId: lead.id }),
      });

      let data: {
        lead?: SavedLead;
        previewUrl?: string;
        ownerEmail?: string;
        error?: string;
        success?: boolean;
      } = {};

      try {
        data = (await response.json()) as typeof data;
      } catch {
        throw new Error(
          response.ok
            ? "Outreach sent but the server returned an invalid response."
            : `Request failed (${response.status}). Check the server logs.`,
        );
      }

      console.log("[SavedLeads] Send Outreach response", {
        ok: response.ok,
        status: response.status,
        data,
      });

      if (!response.ok) {
        throw new Error(data.error ?? `Failed to send outreach email (${response.status}).`);
      }

      if (data.lead) {
        setLeads((current) =>
          current.map((item) => (item.id === lead.id ? data.lead! : item)),
        );
      }

      setSuccessMessage(
        `Outreach email sent to ${data.ownerEmail ?? "the business owner"}${data.previewUrl ? ` — preview: ${data.previewUrl}` : ""}.`,
      );
    } catch (outreachError) {
      const message =
        outreachError instanceof Error
          ? outreachError.message
          : "Failed to send outreach email.";

      console.error("[SavedLeads] Send Outreach failed", message);
      setActionError(message);
    } finally {
      setPending(lead.id, false);
    }
  }

  const rows = leads.map((lead) => {
        const isActionPending = pendingIds.has(lead.id);
        const isRegenerating = regeneratingIds.has(lead.id);
        const isSavingEmail = savingEmail.has(lead.id);
        const emailValue = editingEmail[lead.id] ?? lead.owner_email ?? "";
        const showSiteActions = hasBuiltSite(lead);
        const showReviewActions = isPendingReview(lead);

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
          <div key="email" className="flex min-w-[220px] flex-col gap-1.5">
            <input
              type="email"
              value={emailValue}
              onChange={(event) =>
                setEditingEmail((current) => ({
                  ...current,
                  [lead.id]: event.target.value,
                }))
              }
              placeholder="Owner email"
              disabled={isSavingEmail}
              className="w-full rounded-lg border border-neutral-300 bg-white px-2.5 py-1.5 text-sm text-neutral-900 outline-none transition placeholder:text-neutral-400 focus:border-neutral-900 focus:ring-2 focus:ring-neutral-200 disabled:cursor-not-allowed disabled:opacity-60"
            />
            <button
              type="button"
              disabled={
                isSavingEmail ||
                emailValue.trim() === (lead.owner_email ?? "").trim()
              }
              onClick={() => void handleSaveEmail(lead, emailValue)}
              className="text-left text-xs font-medium text-neutral-600 hover:text-neutral-900 disabled:cursor-not-allowed disabled:opacity-60"
            >
              {isSavingEmail ? "Saving..." : "Save email"}
            </button>
          </div>,
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
              <>
                <div className="flex items-center gap-2">
                  <Link
                    href={`/preview/${lead.site_slug}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-sm font-medium text-neutral-700 hover:text-neutral-900"
                  >
                    View Site
                  </Link>
                  {lead.regenerate_count != null && lead.regenerate_count > 1 ? (
                    <span className="inline-flex rounded-full border border-neutral-200 bg-neutral-100 px-2 py-0.5 text-xs font-medium text-neutral-600">
                      Version {lead.regenerate_count}
                    </span>
                  ) : null}
                </div>
                <Link
                  href={`/preview/${lead.site_slug}?shuffle=true`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-left text-sm font-medium text-violet-600 hover:text-violet-700"
                >
                  Edit Photos
                </Link>
              </>
            ) : null}
            {showReviewActions ? (
              <>
                <button
                  type="button"
                  disabled={isActionPending || isRegenerating}
                  onClick={() => void handleAddToQueue(lead)}
                  className="text-left text-sm font-medium text-emerald-700 hover:text-emerald-800 disabled:cursor-not-allowed disabled:opacity-60"
                >
                  {isActionPending ? "Saving..." : "Add to Queue"}
                </button>
                <button
                  type="button"
                  disabled={isActionPending || isRegenerating}
                  onClick={() => void handleRegenerate(lead)}
                  className="text-left text-sm font-medium text-blue-700 hover:text-blue-800 disabled:cursor-not-allowed disabled:opacity-60"
                >
                  {isRegenerating ? "Regenerating..." : "Regenerate"}
                </button>
              </>
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
  });

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
        <div className="mx-5 mt-5 rounded-lg border border-red-200 bg-red-50 px-4 py-3" role="alert">
          <p className="text-sm font-medium text-red-800">{error}</p>
        </div>
      ) : null}
      {successMessage ? (
        <div className="mx-5 mt-5 rounded-lg border border-emerald-200 bg-emerald-50 px-4 py-3" role="status">
          <p className="text-sm font-medium text-emerald-800">{successMessage}</p>
        </div>
      ) : null}
      {actionError ? (
        <div className="mx-5 mt-5 rounded-lg border border-red-200 bg-red-50 px-4 py-3" role="alert">
          <p className="text-sm font-medium text-red-800">{actionError}</p>
        </div>
      ) : null}
      {!loading && leads.length > 0 ? (
        <DataTable
          columns={["Business", "City", "Industry", "Status", "Email", "Actions"]}
          rows={rows}
        />
      ) : (
        <div className="px-5 py-10 text-sm text-neutral-500">
          {loading
            ? "Loading..."
            : "No saved leads yet. Build a site from search results to add leads here."}
        </div>
      )}
    </Panel>
  );
}
