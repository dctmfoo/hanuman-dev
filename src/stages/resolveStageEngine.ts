import type { RepoConfig, StageConfig } from '../config/schema.js';

export type StageName = 'work' | 'plan' | 'review';
export type EngineName = 'codex' | 'claude';

const DEFAULT_STAGE_ENGINES: Record<StageName, EngineName> = {
  work: 'codex',
  plan: 'claude',
  review: 'claude'
};

export function resolveStageEngine(stage: StageName, config?: RepoConfig): EngineName {
  const stageConfig = (config?.stages?.[stage] as StageConfig | undefined) ?? undefined;
  return stageConfig?.engine ?? DEFAULT_STAGE_ENGINES[stage];
}
