export const MAX_CONCURRENT_BUILDS = 3;

export const BUILD_STAGES = [
  { label: "Generating content...", durationMs: 45_000, targetProgress: 45 },
  { label: "Adding images...", durationMs: 35_000, targetProgress: 80 },
  { label: "Finalizing...", durationMs: 25_000, targetProgress: 95 },
] as const;

export type BuildJobStatus = "queued" | "building";

export type BuildJobMode = "build" | "rebuild";

export type BuildJobState = {
  status: BuildJobStatus;
  stageIndex: number;
  progress: number;
  stageLabel: string;
  startedAt?: number;
  mode: BuildJobMode;
};

export function computeBuildProgress(startedAt: number, now = Date.now()) {
  const elapsed = now - startedAt;
  let accumulated = 0;

  for (let index = 0; index < BUILD_STAGES.length; index++) {
    const stage = BUILD_STAGES[index];
    const previousTarget =
      index === 0 ? 0 : BUILD_STAGES[index - 1].targetProgress;

    if (elapsed < accumulated + stage.durationMs) {
      const stageElapsed = elapsed - accumulated;
      const stageRatio = stageElapsed / stage.durationMs;
      const progress =
        previousTarget + stageRatio * (stage.targetProgress - previousTarget);

      return {
        stageIndex: index,
        progress: Math.min(progress, stage.targetProgress),
        stageLabel: stage.label,
      };
    }

    accumulated += stage.durationMs;
  }

  const finalStage = BUILD_STAGES[BUILD_STAGES.length - 1];
  return {
    stageIndex: BUILD_STAGES.length - 1,
    progress: finalStage.targetProgress,
    stageLabel: finalStage.label,
  };
}

export function createQueuedBuildJob(mode: BuildJobMode = "build"): BuildJobState {
  return {
    status: "queued",
    stageIndex: 0,
    progress: 0,
    stageLabel:
      mode === "rebuild" ? "Waiting to rebuild..." : "Waiting for build slot...",
    mode,
  };
}

export function createActiveBuildJob(
  mode: BuildJobMode = "build",
  startedAt = Date.now(),
): BuildJobState {
  const initial = computeBuildProgress(startedAt, startedAt);
  return {
    status: "building",
    stageIndex: initial.stageIndex,
    progress: initial.progress,
    stageLabel: initial.stageLabel,
    startedAt,
    mode,
  };
}
