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
  currentStoryIndex: number;
  completedStoryIds: string[];
  updatedAt: string;
};
