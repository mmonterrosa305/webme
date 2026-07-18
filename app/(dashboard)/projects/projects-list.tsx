"use client";

import Link from "next/link";
import slugify from "slugify";
import { useCallback, useEffect, useRef, useState } from "react";

import type { ProjectListItem } from "@/lib/projects/types";

import { DataTable, Panel } from "../_components/dashboard-ui";
import { RebuildSequenceModal } from "../outreach-queue/rebuild-sequence-modal";

const inputClassName =
  "w-full rounded-lg border border-neutral-300 bg-white px-3 py-2 text-sm text-neutral-900 outline-none transition placeholder:text-neutral-400 focus:border-neutral-900 focus:ring-2 focus:ring-neutral-200";

function formatBuiltDate(value: string) {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return "—";
  }

  return date.toLocaleDateString(undefined, {
    year: "numeric",
    month: "short",
    day: "numeric",
  });
}

export function ProjectsList() {
  const [projects, setProjects] = useState<ProjectListItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [pendingIds, setPendingIds] = useState<Set<string>>(new Set());
  const [rebuildModalProject, setRebuildModalProject] =
    useState<ProjectListItem | null>(null);
  const [previewEmailComposerId, setPreviewEmailComposerId] = useState<
    string | null
  >(null);
  const [previewEmails, setPreviewEmails] = useState<Record<string, string>>(
    {},
  );
  const [sendingPreviewEmailIds, setSendingPreviewEmailIds] = useState<
    Set<string>
  >(new Set());
  const [previewEmailSentIds, setPreviewEmailSentIds] = useState<Set<string>>(
    new Set(),
  );
  const [previewEmailToastId, setPreviewEmailToastId] = useState<string | null>(
    null,
  );
  const [previewEmailErrorById, setPreviewEmailErrorById] = useState<
    Record<string, string>
  >({});
  const previewEmailToastTimerRef = useRef<number | null>(null);

  const loadProjects = useCallback(async () => {
    setLoading(true);
    setError(null);

    try {
      const response = await fetch("/api/projects");
      const data = (await response.json()) as {
        projects?: ProjectListItem[];
        error?: string;
      };

      if (!response.ok) {
        throw new Error(data.error ?? "Failed to load projects.");
      }

      setProjects(data.projects ?? []);
    } catch (loadError) {
      setError(
        loadError instanceof Error
          ? loadError.message
          : "Failed to load projects.",
      );
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadProjects();
  }, [loadProjects]);

  useEffect(() => {
    return () => {
      if (previewEmailToastTimerRef.current) {
        window.clearTimeout(previewEmailToastTimerRef.current);
      }
    };
  }, []);

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

  async function handleRemove(project: ProjectListItem) {
    setActionError(null);
    setSuccessMessage(null);
    setPending(project.id, true);

    try {
      const response = await fetch(`/api/projects?id=${encodeURIComponent(project.id)}`, {
        method: "DELETE",
      });
      const data = (await response.json()) as { error?: string };

      if (!response.ok) {
        throw new Error(data.error ?? "Failed to remove project.");
      }

      setProjects((current) => current.filter((item) => item.id !== project.id));
      setSuccessMessage(`Removed ${project.business_name} from Projects.`);
    } catch (removeError) {
      setActionError(
        removeError instanceof Error
          ? removeError.message
          : "Failed to remove project.",
      );
    } finally {
      setPending(project.id, false);
    }
  }

  async function handleDownload(project: ProjectListItem) {
    setActionError(null);
    setPending(project.id, true);

    try {
      const response = await fetch(
        `/api/projects?id=${encodeURIComponent(project.id)}`,
      );
      const data = (await response.json()) as {
        project?: { site_html?: string };
        error?: string;
      };

      if (!response.ok || !data.project?.site_html) {
        throw new Error(data.error ?? "Failed to download HTML.");
      }

      const filename = `${slugify(project.business_name || "website", {
        lower: true,
        strict: true,
      })}.html`;
      const blob = new Blob([data.project.site_html], {
        type: "text/html;charset=utf-8",
      });
      const url = URL.createObjectURL(blob);
      const anchor = document.createElement("a");
      anchor.href = url;
      anchor.download = filename;
      anchor.click();
      URL.revokeObjectURL(url);
    } catch (downloadError) {
      setActionError(
        downloadError instanceof Error
          ? downloadError.message
          : "Failed to download HTML.",
      );
    } finally {
      setPending(project.id, false);
    }
  }

  async function handleConfirmRebuild(scrollHeroSequencePresetId: string) {
    if (!rebuildModalProject) {
      return;
    }

    const project = rebuildModalProject;
    setRebuildModalProject(null);
    setActionError(null);
    setSuccessMessage(null);
    setPending(project.id, true);

    try {
      const response = await fetch("/api/outreach-queue/rebuild", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          site_slug: project.site_slug,
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

      setSuccessMessage(`Rebuilt ${project.business_name}.`);
      await loadProjects();
    } catch (rebuildError) {
      setActionError(
        rebuildError instanceof Error
          ? rebuildError.message
          : "Failed to rebuild site.",
      );
    } finally {
      setPending(project.id, false);
    }
  }

  async function handleSendPreviewEmail(project: ProjectListItem) {
    const ownerEmail = (previewEmails[project.id] ?? "").trim();
    setActionError(null);
    setPreviewEmailErrorById((current) => {
      const next = { ...current };
      delete next[project.id];
      return next;
    });

    if (!ownerEmail) {
      setPreviewEmailErrorById((current) => ({
        ...current,
        [project.id]: "Enter an email address.",
      }));
      return;
    }

    setSendingPreviewEmailIds((current) => new Set(current).add(project.id));

    try {
      const response = await fetch("/api/business-search/send-preview-email", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          siteSlug: project.site_slug,
          ownerEmail,
        }),
      });
      const data = (await response.json()) as { error?: string };

      if (!response.ok) {
        throw new Error(data.error ?? "Failed to send preview email.");
      }

      setPreviewEmailSentIds((current) => new Set(current).add(project.id));
      setPreviewEmailComposerId(null);
      setPreviewEmailToastId(project.id);
      if (previewEmailToastTimerRef.current) {
        window.clearTimeout(previewEmailToastTimerRef.current);
      }
      previewEmailToastTimerRef.current = window.setTimeout(() => {
        setPreviewEmailToastId(null);
      }, 3000);
    } catch (emailError) {
      setPreviewEmailErrorById((current) => ({
        ...current,
        [project.id]:
          emailError instanceof Error
            ? emailError.message
            : "Failed to send preview email.",
      }));
    } finally {
      setSendingPreviewEmailIds((current) => {
        const next = new Set(current);
        next.delete(project.id);
        return next;
      });
    }
  }

  const rows = projects.map((project) => {
    const isPending = pendingIds.has(project.id);

    return [
      <div key="business" className="min-w-[160px]">
        <Link
          href={`/preview/${project.site_slug}`}
          target="_blank"
          rel="noopener noreferrer"
          className="font-medium text-neutral-900 hover:underline"
        >
          {project.business_name}
        </Link>
        {project.industry ? (
          <p className="mt-0.5 text-xs text-neutral-500">{project.industry}</p>
        ) : null}
      </div>,
      <span key="city" className="text-neutral-600">
        {project.city}
      </span>,
      <span key="date" className="text-neutral-600">
        {formatBuiltDate(project.site_built_at)}
      </span>,
      <div key="actions" className="flex min-w-[180px] flex-col gap-2">
        <Link
          href={`/preview/${project.site_slug}`}
          target="_blank"
          rel="noopener noreferrer"
          className="rounded-lg bg-neutral-900 px-3 py-2 text-center text-sm font-medium text-white transition hover:bg-neutral-800"
        >
          Open Preview
        </Link>
        <button
          type="button"
          onClick={() => void handleDownload(project)}
          disabled={isPending}
          className="rounded-lg border border-neutral-300 bg-white px-3 py-2 text-sm font-medium text-neutral-900 transition hover:bg-neutral-50 disabled:opacity-60"
        >
          Download HTML
        </button>
        {previewEmailToastId === project.id ? (
          <p
            className="flex items-center gap-1.5 rounded-lg border border-emerald-200 bg-emerald-50 px-3 py-2 text-sm font-medium text-emerald-800"
            role="status"
          >
            <span aria-hidden>✓</span>
            Preview email sent!
          </p>
        ) : previewEmailSentIds.has(project.id) ? (
          <button
            type="button"
            onClick={() => {
              setPreviewEmailSentIds((current) => {
                const next = new Set(current);
                next.delete(project.id);
                return next;
              });
              setPreviewEmailComposerId(project.id);
            }}
            disabled={isPending || sendingPreviewEmailIds.has(project.id)}
            className="rounded-lg border border-emerald-300 bg-emerald-50 px-3 py-2 text-sm font-medium text-emerald-900 transition hover:bg-emerald-100 disabled:opacity-60"
          >
            Send Again
          </button>
        ) : previewEmailComposerId === project.id ? (
          <div className="space-y-2 rounded-lg border border-neutral-200 bg-neutral-50 p-2">
            <input
              type="email"
              value={previewEmails[project.id] ?? ""}
              onChange={(event) =>
                setPreviewEmails((current) => ({
                  ...current,
                  [project.id]: event.target.value,
                }))
              }
              placeholder="owner@business.com"
              disabled={sendingPreviewEmailIds.has(project.id)}
              className={`${inputClassName} disabled:cursor-not-allowed disabled:opacity-60`}
            />
            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => void handleSendPreviewEmail(project)}
                disabled={sendingPreviewEmailIds.has(project.id) || isPending}
                className="flex-1 rounded-lg bg-emerald-600 px-3 py-2 text-sm font-medium text-white transition hover:bg-emerald-500 disabled:opacity-60"
              >
                {sendingPreviewEmailIds.has(project.id) ? "Sending..." : "Send"}
              </button>
              <button
                type="button"
                onClick={() => setPreviewEmailComposerId(null)}
                disabled={sendingPreviewEmailIds.has(project.id)}
                className="rounded-lg border border-neutral-300 bg-white px-3 py-2 text-sm font-medium text-neutral-700 transition hover:bg-neutral-50 disabled:opacity-60"
              >
                Cancel
              </button>
            </div>
            {previewEmailErrorById[project.id] ? (
              <p className="text-xs font-medium text-red-600" role="alert">
                {previewEmailErrorById[project.id]}
              </p>
            ) : null}
          </div>
        ) : (
          <button
            type="button"
            onClick={() => setPreviewEmailComposerId(project.id)}
            disabled={isPending}
            className="rounded-lg border border-emerald-300 bg-emerald-50 px-3 py-2 text-sm font-medium text-emerald-900 transition hover:bg-emerald-100 disabled:opacity-60"
          >
            Send Preview Email
          </button>
        )}
        <button
          type="button"
          onClick={() => setRebuildModalProject(project)}
          disabled={isPending}
          className="rounded-lg border border-neutral-300 bg-white px-3 py-2 text-sm font-medium text-neutral-900 transition hover:bg-neutral-50 disabled:opacity-60"
        >
          {isPending ? "Working…" : "Rebuild"}
        </button>
        <button
          type="button"
          onClick={() => void handleRemove(project)}
          disabled={isPending}
          className="text-left text-sm font-medium text-red-600 hover:text-red-700 disabled:opacity-60"
        >
          Remove
        </button>
      </div>,
    ];
  });

  return (
    <div className="space-y-6">
      {previewEmailToastId ? (
        <div
          className="fixed bottom-6 right-6 z-[100] flex items-center gap-2 rounded-xl border border-emerald-300 bg-emerald-50 px-4 py-3 text-sm font-semibold text-emerald-900 shadow-lg"
          role="status"
        >
          <span aria-hidden>✓</span>
          Preview email sent!
        </div>
      ) : null}
      {successMessage ? (
        <div className="rounded-lg border border-emerald-200 bg-emerald-50 px-4 py-3">
          <p className="text-sm font-medium text-emerald-800">{successMessage}</p>
        </div>
      ) : null}
      {actionError || error ? (
        <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3">
          <p className="text-sm font-medium text-red-800">
            {actionError ?? error}
          </p>
        </div>
      ) : null}
      <Panel
        title="Projects"
        subtitle={
          loading
            ? "Loading..."
            : `${projects.length} saved site${projects.length === 1 ? "" : "s"}`
        }
      >
        {projects.length > 0 ? (
          <DataTable
            columns={["Business", "City", "Date built", "Actions"]}
            rows={rows}
          />
        ) : (
          <div className="px-5 py-10 text-sm text-neutral-500">
            {loading
              ? "Loading..."
              : "No projects yet. Build a site from Create Site and it will appear here."}
          </div>
        )}
      </Panel>
      {rebuildModalProject ? (
        <RebuildSequenceModal
          businessName={rebuildModalProject.business_name}
          industry={rebuildModalProject.industry}
          onCancel={() => setRebuildModalProject(null)}
          onConfirm={handleConfirmRebuild}
        />
      ) : null}
    </div>
  );
}
