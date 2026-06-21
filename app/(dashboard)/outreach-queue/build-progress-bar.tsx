type BuildProgressBarProps = {
  label: string;
  progress: number;
  queued?: boolean;
};

export function BuildProgressBar({
  label,
  progress,
  queued = false,
}: BuildProgressBarProps) {
  return (
    <div className="space-y-1.5">
      <div className="flex items-center justify-between gap-3 text-xs">
        <span className="font-medium text-neutral-700">{label}</span>
        {!queued ? (
          <span className="tabular-nums text-neutral-500">
            {Math.round(progress)}%
          </span>
        ) : null}
      </div>
      <div
        className="h-1.5 w-full overflow-hidden rounded-full bg-neutral-200"
        role="progressbar"
        aria-valuemin={0}
        aria-valuemax={100}
        aria-valuenow={queued ? 0 : Math.round(progress)}
        aria-label={label}
      >
        <div
          className={`h-full rounded-full bg-neutral-900 transition-[width] duration-500 ease-out${
            queued ? " w-1/3 animate-pulse" : ""
          }`}
          style={queued ? undefined : { width: `${Math.min(progress, 100)}%` }}
        />
      </div>
    </div>
  );
}
