import { writeJson } from '../lib/fs.js';
import type { RunDir } from './runDir.js';
import type { RunJsonV01, RunStatusState, RunStatusV01, StopReason } from './types.js';

type RunStatusInput = {
  runDir: RunDir;
  run: RunJsonV01;
  state?: RunStatusState;
  message?: string;
  currentStoryId?: string | null;
  stopReason?: StopReason;
  exitStatus?: number;
};

export function buildRunStatus(input: RunStatusInput): RunStatusV01 {
  const { runDir, run } = input;
  const completed = run.progress?.completedStoryIds?.length ?? 0;
  const total = run.prd?.storyCount;
  const nextStoryId = run.progress?.nextStoryId ?? null;

  const stopReason = input.stopReason ?? run.stopReason;
  const exitStatus = input.exitStatus ?? run.exitStatus ?? run.exitCode;

  const state: RunStatusState = input.state ?? (stopReason ? 'stopped' : 'running');
  const currentStoryId = input.currentStoryId !== undefined ? input.currentStoryId : state === 'running' ? nextStoryId : null;

  return {
    contractVersion: '0.1',
    runId: run.runId,
    updatedAt: new Date().toISOString(),
    state,
    stopReason,
    exitStatus,
    message: input.message,
    progress: {
      completed,
      total,
      nextStoryId,
      currentStoryId,
      currentStoryIndex: run.progress?.currentStoryIndex
    },
    paths: {
      runDir: runDir.root,
      runJsonPath: runDir.runJsonPath,
      statusPath: runDir.statusPath,
      eventsPath: runDir.eventsPath,
      logsPath: runDir.logsPath,
      artifactsDir: runDir.artifactsDir,
      checkpointsDir: runDir.checkpointsDir,
      debugBundleDir: runDir.debugBundleDir
    }
  };
}

export async function writeRunStatus(input: RunStatusInput): Promise<RunStatusV01 | undefined> {
  const status = buildRunStatus(input);
  try {
    await writeJson(input.runDir.statusPath, status);
    return status;
  } catch {
    // best-effort: status should not break a run
    return undefined;
  }
}
