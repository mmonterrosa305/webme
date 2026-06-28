"use client";

import { useCallback, useEffect, useMemo, useState } from "react";

import { INDUSTRIES } from "@/lib/agents/site-options";
import { readJsonResponse } from "@/lib/api/fetch-json";
import {
  MAX_SEQUENCES_PER_INDUSTRY,
  type ImageSequencePreset,
} from "@/lib/image-sequences/types";

import { Panel } from "../_components/dashboard-ui";
import { PresetImageSequencePicker } from "../_components/preset-image-sequence-picker";

const inputClassName =
  "w-full rounded-lg border border-neutral-300 bg-white px-4 py-2.5 text-neutral-900 outline-none transition placeholder:text-neutral-400 focus:border-neutral-900 focus:ring-2 focus:ring-neutral-200";

export function ImageSequenceLibrarySection() {
  const [sequences, setSequences] = useState<ImageSequencePreset[]>([]);
  const [loading, setLoading] = useState(true);
  const [uploadIndustry, setUploadIndustry] = useState<string>(INDUSTRIES[0]);
  const [uploadLabel, setUploadLabel] = useState("");
  const [uploadZipFile, setUploadZipFile] = useState<File | null>(null);
  const [uploadVideoFile, setUploadVideoFile] = useState<File | null>(null);
  const [uploading, setUploading] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [selectedSequenceId, setSelectedSequenceId] = useState<string | null>(
    null,
  );
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);

  const filteredSequences = useMemo(
    () => sequences.filter((sequence) => sequence.industry === uploadIndustry),
    [sequences, uploadIndustry],
  );

  const industryCount = filteredSequences.length;
  const suggestedLabel = `Sequence ${industryCount + 1}`;

  const loadSequences = useCallback(async () => {
    setLoading(true);
    setError(null);

    try {
      const response = await fetch("/api/image-sequences");
      const data = await readJsonResponse<{
        sequences?: ImageSequencePreset[];
        error?: string;
      }>(response);

      if (!response.ok) {
        throw new Error(data.error ?? "Failed to load image sequences.");
      }

      setSequences(data.sequences ?? []);
    } catch (loadError) {
      setError(
        loadError instanceof Error
          ? loadError.message
          : "Failed to load image sequences.",
      );
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadSequences();
  }, [loadSequences]);

  useEffect(() => {
    setSelectedSequenceId(null);
  }, [uploadIndustry]);

  useEffect(() => {
    setSelectedSequenceId((current) =>
      current && filteredSequences.some((sequence) => sequence.id === current)
        ? current
        : null,
    );
  }, [filteredSequences]);

  async function handleUpload(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (!uploadZipFile && !uploadVideoFile) {
      return;
    }

    setUploading(true);
    setError(null);
    setMessage(null);

    try {
      const formData = new FormData();
      formData.append("industry", uploadIndustry);
      formData.append("label", uploadLabel.trim() || suggestedLabel);
      if (uploadVideoFile) {
        formData.append("videoFile", uploadVideoFile);
      } else if (uploadZipFile) {
        formData.append("zipFile", uploadZipFile);
      }

      const response = await fetch("/api/image-sequences", {
        method: "POST",
        body: formData,
      });

      const data = await readJsonResponse<{
        sequence?: ImageSequencePreset;
        error?: string;
      }>(response);

      if (!response.ok) {
        throw new Error(data.error ?? "Failed to upload image sequence.");
      }

      setMessage(
        `Added ${data.sequence?.label ?? "sequence"} (${uploadIndustry}) with ${data.sequence?.frame_count ?? 0} frames.`,
      );
      setUploadLabel("");
      setUploadZipFile(null);
      setUploadVideoFile(null);
      await loadSequences();
    } catch (uploadError) {
      setError(
        uploadError instanceof Error
          ? uploadError.message
          : "Failed to upload image sequence.",
      );
    } finally {
      setUploading(false);
    }
  }

  async function handleDelete(sequence: ImageSequencePreset) {
    setDeletingId(sequence.id);

    try {
      const response = await fetch(`/api/image-sequences/${sequence.id}`, {
        method: "DELETE",
      });

      const data = await readJsonResponse<{ error?: string }>(response);

      if (!response.ok) {
        throw new Error(data.error ?? "Failed to delete sequence.");
      }

      setMessage(`Deleted ${sequence.label} (${sequence.industry}).`);
      await loadSequences();
    } catch (deleteError) {
      setError(
        deleteError instanceof Error
          ? deleteError.message
          : "Failed to delete sequence.",
      );
    } finally {
      setDeletingId(null);
    }
  }

  return (
    <div className="space-y-6">
      <Panel
        title="Upload image sequence"
        subtitle={`Accepts ZIP of JPG, PNG, or WebP frames, or an MP4/WebM/MOV video to extract WebP frames (1920px wide, quality 90). Up to ${MAX_SEQUENCES_PER_INDUSTRY} per industry.`}
      >
        <form onSubmit={(event) => void handleUpload(event)} className="space-y-4 px-5 py-5">
          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <label
                htmlFor="sequenceIndustry"
                className="mb-2 block text-sm font-medium text-neutral-700"
              >
                Industry
              </label>
              <select
                id="sequenceIndustry"
                value={uploadIndustry}
                onChange={(event) => setUploadIndustry(event.target.value)}
                className={inputClassName}
                disabled={uploading}
              >
                {INDUSTRIES.map((industry) => (
                  <option key={industry} value={industry}>
                    {industry}
                  </option>
                ))}
              </select>
              <p className="mt-1 text-xs text-neutral-500">
                {industryCount} of {MAX_SEQUENCES_PER_INDUSTRY} slots used
              </p>
            </div>

            <div>
              <label
                htmlFor="sequenceLabel"
                className="mb-2 block text-sm font-medium text-neutral-700"
              >
                Label
              </label>
              <input
                id="sequenceLabel"
                type="text"
                value={uploadLabel}
                onChange={(event) => setUploadLabel(event.target.value)}
                placeholder={suggestedLabel}
                className={inputClassName}
                disabled={uploading}
              />
            </div>
          </div>

          <div>
            <label
              htmlFor="sequenceZip"
              className="mb-2 block text-sm font-medium text-neutral-700"
            >
              ZIP file
            </label>
            <input
              id="sequenceZip"
              type="file"
              accept=".zip,application/zip,application/x-zip-compressed"
              disabled={
                uploading ||
                industryCount >= MAX_SEQUENCES_PER_INDUSTRY ||
                uploadVideoFile !== null
              }
              onChange={(event) => {
                setUploadZipFile(event.target.files?.[0] ?? null);
                if (event.target.files?.[0]) {
                  setUploadVideoFile(null);
                }
              }}
              className="block w-full text-sm text-neutral-700 file:mr-3 file:rounded-md file:border file:border-neutral-300 file:bg-white file:px-3 file:py-1.5 file:text-sm file:font-medium file:text-neutral-700 hover:file:bg-neutral-50"
            />
            {uploadZipFile ? (
              <p className="mt-1 text-xs text-neutral-600">{uploadZipFile.name}</p>
            ) : null}
          </div>

          <div>
            <label
              htmlFor="sequenceVideo"
              className="mb-2 block text-sm font-medium text-neutral-700"
            >
              Or video file
            </label>
            <input
              id="sequenceVideo"
              type="file"
              accept="video/mp4,video/webm,video/quicktime,.mp4,.webm,.mov"
              disabled={
                uploading ||
                industryCount >= MAX_SEQUENCES_PER_INDUSTRY ||
                uploadZipFile !== null
              }
              onChange={(event) => {
                setUploadVideoFile(event.target.files?.[0] ?? null);
                if (event.target.files?.[0]) {
                  setUploadZipFile(null);
                }
              }}
              className="block w-full text-sm text-neutral-700 file:mr-3 file:rounded-md file:border file:border-neutral-300 file:bg-white file:px-3 file:py-1.5 file:text-sm file:font-medium file:text-neutral-700 hover:file:bg-neutral-50"
            />
            {uploadVideoFile ? (
              <p className="mt-1 text-xs text-neutral-600">{uploadVideoFile.name}</p>
            ) : null}
          </div>

          <button
            type="submit"
            disabled={
              uploading ||
              (!uploadZipFile && !uploadVideoFile) ||
              industryCount >= MAX_SEQUENCES_PER_INDUSTRY
            }
            className="rounded-lg bg-neutral-900 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-neutral-800 disabled:cursor-not-allowed disabled:opacity-60"
          >
            {uploading ? "Uploading..." : "Add image sequence"}
          </button>
        </form>
      </Panel>

      <Panel
        title="Sequence library"
        subtitle={`Image sequences for ${uploadIndustry}.`}
      >
        {loading ? (
          <p className="px-5 py-5 text-sm text-neutral-600">Loading sequences...</p>
        ) : filteredSequences.length === 0 ? (
          <p className="px-5 py-5 text-sm text-neutral-600">
            No image sequences for {uploadIndustry} yet.
          </p>
        ) : (
          <div className="space-y-4 px-5 py-5">
            <PresetImageSequencePicker
              industry={uploadIndustry}
              selectedSequenceId={selectedSequenceId}
              onSelectedSequenceIdChange={setSelectedSequenceId}
              enabled
              showAutoSelect={false}
              gridClassName="grid gap-3 sm:grid-cols-2 lg:grid-cols-3"
            />
            <div className="flex flex-wrap gap-2">
              {filteredSequences.map((sequence) => (
                <button
                  key={sequence.id}
                  type="button"
                  disabled={deletingId === sequence.id}
                  onClick={() => void handleDelete(sequence)}
                  className="rounded-md border border-neutral-300 px-2.5 py-1 text-xs font-medium text-neutral-700 transition hover:bg-neutral-50 disabled:cursor-not-allowed disabled:opacity-60"
                >
                  {deletingId === sequence.id
                    ? "Deleting..."
                    : `Delete ${sequence.label}`}
                </button>
              ))}
            </div>
          </div>
        )}
      </Panel>

      {message ? (
        <p className="text-sm font-medium text-emerald-700" role="status">
          {message}
        </p>
      ) : null}
      {error ? (
        <p className="text-sm font-medium text-red-700" role="alert">
          {error}
        </p>
      ) : null}
    </div>
  );
}
