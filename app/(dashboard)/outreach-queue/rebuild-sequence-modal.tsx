"use client";

import { useEffect, useId, useState } from "react";

import { PresetImageSequencePicker } from "../_components/preset-image-sequence-picker";

type RebuildSequenceModalProps = {
  businessName: string;
  industry?: string | null;
  onCancel: () => void;
  onConfirm: (sequenceId: string) => void;
};

export function RebuildSequenceModal({
  businessName,
  industry,
  onCancel,
  onConfirm,
}: RebuildSequenceModalProps) {
  const titleId = useId();
  const [selectedSequenceId, setSelectedSequenceId] = useState<string | null>(
    null,
  );

  useEffect(() => {
    setSelectedSequenceId(null);
  }, [businessName, industry]);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <button
        type="button"
        aria-label="Close rebuild dialog"
        className="absolute inset-0 bg-black/40"
        onClick={onCancel}
      />
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        className="relative flex max-h-[90vh] w-full max-w-2xl flex-col overflow-hidden rounded-xl border border-neutral-200 bg-white shadow-xl"
      >
        <div className="border-b border-neutral-200 px-5 py-4">
          <h2 id={titleId} className="text-lg font-semibold text-neutral-900">
            Rebuild with image sequence
          </h2>
          <p className="mt-1 text-sm text-neutral-600">
            Choose a sequence from the Video Library for{" "}
            <span className="font-medium text-neutral-900">{businessName}</span>
            .
          </p>
        </div>

        <div className="overflow-y-auto px-5 py-4">
          <PresetImageSequencePicker
            industry={industry ?? undefined}
            selectedSequenceId={selectedSequenceId}
            onSelectedSequenceIdChange={setSelectedSequenceId}
            enabled
            showAutoSelect={false}
            gridClassName="grid gap-3 sm:grid-cols-2"
          />
        </div>

        <div className="flex flex-wrap items-center justify-end gap-2 border-t border-neutral-200 px-5 py-4">
          <button
            type="button"
            onClick={onCancel}
            className="rounded-lg border border-neutral-300 bg-white px-4 py-2.5 text-sm font-semibold text-neutral-900 transition hover:bg-neutral-50"
          >
            Cancel
          </button>
          <button
            type="button"
            disabled={!selectedSequenceId}
            onClick={() => {
              if (selectedSequenceId) {
                onConfirm(selectedSequenceId);
              }
            }}
            className="rounded-lg bg-neutral-900 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-neutral-800 disabled:cursor-not-allowed disabled:opacity-60"
          >
            Confirm Rebuild
          </button>
        </div>
      </div>
    </div>
  );
}
