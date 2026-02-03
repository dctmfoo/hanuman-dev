export type EngineExecOptions = {
  cwd: string;
  prompt: string;
  eventsPath: string;
  outputSchema?: object;
  sandbox: boolean;
  askForApproval: boolean;
  profile?: string;
  configOverrides: Record<string, string>;
  timeoutMs?: number;
};

export type EngineExecResult = {
  code: number;
  signal?: NodeJS.Signals;
  lastOutputJson?: unknown;
  stderrTail?: string;
};

export type Engine = {
  name: string;
  execJsonl(opts: EngineExecOptions): Promise<EngineExecResult>;
  getVersion?(cwd: string): Promise<string | undefined>;
  getFeaturesBestEffort?(cwd: string): Promise<string[] | undefined>;
};
