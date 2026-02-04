import { describe, expect, it } from 'vitest';
import { RepoConfigSchema } from './schema.js';

describe('RepoConfigSchema', () => {
  it('accepts plan/review stage config blocks', () => {
    const cfg = {
      schemaVersion: '0.1',
      stages: {
        plan: { engine: 'claude', model: 'opus', reasoning: 'high' },
        review: { engine: 'claude', model: 'opus', reasoning: 'high' },
        work: { engine: 'codex', sandbox: true }
      }
    };

    const parsed = RepoConfigSchema.safeParse(cfg);
    expect(parsed.success).toBe(true);
  });
});
