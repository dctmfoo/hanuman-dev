export type StopReason =
  | 'SUCCESS'
  | 'DIRTY_WORKTREE'
  | 'NOT_A_GIT_REPO'
  | 'VALIDATION_FAILED'
  | 'ENGINE_ERROR'
  | 'APPROVAL_DENIED'
  | 'USER_ABORT'
  | 'UNKNOWN_ERROR';

export type RunJsonV01 = {
  contractVersion: '0.1';
  runId: string;
  title?: string;
  createdAt: string;

  /** Contract fields (docs/prd-v0.1.md) */
  startTime?: string;
  endTime?: string;

  /** Legacy/internal aliases (kept for compatibility) */
  startedAt?: string;
  finishedAt?: string;

  cwd: string;
  repo: {
    path: string;
    branch?: string;
    headSha?: string;
    fetch?: { ok: boolean; code: number; stdout: string; stderr: string };
  };
  codex: {
    version?: string;
    features?: string[];
    notes?: string[];
  };
  cli: {
    argv: string[];
    prdPath?: string;
    resumeFrom?: string;
    sandbox: boolean;
    askForApproval: boolean;
    profile?: string;
    configOverrides: Record<string, string>;
  };
  prd?: {
    schemaVersion: string;
    title: string;
    storyCount: number;
    sha256?: string;
  };
  progress: {
    currentStoryIndex: number;
    completedStoryIds: string[];
    nextStoryId?: string | null;
  };
  stopReason?: StopReason;

  /** Contract field (docs/prd-v0.1.md) */
  exitStatus?: number;

  /** Legacy/internal alias */
  exitCode?: number;

  error?: { message: string; stack?: string };
};

export type CheckpointStateV01 = {
  contractVersion: '0.1';
  runId: string;

  /**
   * Back-compat field (older checkpoints may only have index-based progress).
   * v0.1+ prefers story-id based progress via nextStoryId.
   */
  currentStoryIndex: number;

  completedStoryIds: string[];

  /** Next story to run (by id). If undefined/null, executor computes it from PRD + completedStoryIds. */
  nextStoryId?: string | null;

  updatedAt: string;
};

export type RunStatusState = 'initializing' | 'running' | 'stopped';

export type RunStatusV01 = {
  contractVersion: '0.1';
  runId: string;
  updatedAt: string;
  state: RunStatusState;
  stopReason?: StopReason;
  exitStatus?: number;
  message?: string;
  progress: {
    completed: number;
    total?: number;
    nextStoryId?: string | null;
    currentStoryId?: string | null;
    currentStoryIndex?: number;
  };
  paths: {
    runDir: string;
    runJsonPath: string;
    statusPath: string;
    eventsPath: string;
    logsPath: string;
    artifactsDir: string;
    checkpointsDir: string;
    debugBundleDir: string;
  };
};
