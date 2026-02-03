import { describe, expect, it } from 'vitest';
import { resolveStageEngine } from './resolveStageEngine.js';
import type { RepoConfig } from '../config/schema.js';

describe('resolveStageEngine', () => {
  it('defaults work to codex and plan/review to claude', () => {
    expect(resolveStageEngine('work')).toBe('codex');
    expect(resolveStageEngine('plan')).toBe('claude');
    expect(resolveStageEngine('review')).toBe('claude');
  });

  it('honors stage engine overrides', () => {
    const cfg: RepoConfig = {
      schemaVersion: '0.1',
      stages: {
        work: { engine: 'claude' },
        plan: { engine: 'codex' },
        review: { engine: 'codex' }
      }
    };

    expect(resolveStageEngine('work', cfg)).toBe('claude');
    expect(resolveStageEngine('plan', cfg)).toBe('codex');
    expect(resolveStageEngine('review', cfg)).toBe('codex');
  });
});
