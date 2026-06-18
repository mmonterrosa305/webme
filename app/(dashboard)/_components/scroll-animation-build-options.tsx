"use client";

export function ScrollAnimationBuildOptions({
  checked,
  onCheckedChange,
  disabled,
  videoFile,
  onVideoFileChange,
}: {
  checked: boolean;
  onCheckedChange: (checked: boolean) => void;
  disabled?: boolean;
  videoFile: File | null;
  onVideoFileChange: (file: File | null) => void;
}) {
  function handleCheckedChange(nextChecked: boolean) {
    onCheckedChange(nextChecked);

    if (!nextChecked) {
      onVideoFileChange(null);
    }
  }

  return (
    <div className="flex flex-wrap items-start gap-4">
      <label className="flex cursor-pointer items-center gap-2 text-sm text-neutral-700">
        <input
          type="checkbox"
          checked={checked}
          onChange={(event) => handleCheckedChange(event.target.checked)}
          disabled={disabled}
          className="h-4 w-4 rounded border-neutral-300 text-neutral-900 focus:ring-neutral-900"
        />
        ✨ Add scroll animation effect
      </label>

      {checked ? (
        <div className="min-w-[220px]">
          <label className="block text-sm text-neutral-700">
            <span className="mb-1 block font-medium">Upload video (optional)</span>
            <input
              type="file"
              accept="video/mp4,video/webm,video/quicktime"
              disabled={disabled}
              onChange={(event) => {
                onVideoFileChange(event.target.files?.[0] ?? null);
              }}
              className="block w-full max-w-xs text-sm text-neutral-700 file:mr-3 file:rounded-md file:border file:border-neutral-300 file:bg-white file:px-3 file:py-1.5 file:text-sm file:font-medium file:text-neutral-700 hover:file:bg-neutral-50"
            />
          </label>
          <p className="mt-1 text-xs text-neutral-500">
            Leave empty to auto-select a video based on the business industry
          </p>
          {videoFile ? (
            <p className="mt-1 text-xs text-neutral-600">{videoFile.name}</p>
          ) : null}
        </div>
      ) : null}
    </div>
  );
}
