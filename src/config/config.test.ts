import { describe, expect, it } from 'vitest';
import os from 'node:os';
import path from 'node:path';
import fs from 'node:fs/promises';
import { execCapture } from '../lib/proc.js';
import { loadResolvedConfig, getRepoConfigPath } from './config.js';
import { writeJson } from '../lib/fs.js';

async function makeTempGitRepo(): Promise<string> {
  const dir = await fs.mkdtemp(path.join(os.tmpdir(), 'hanuman-config-'));
  const r = await execCapture('git', ['init'], { cwd: dir });
  if (r.code !== 0) throw new Error(`git init failed: ${r.stderr}`);
  return dir;
}

describe('loadResolvedConfig', () => {
  it('preserves plan/review stage config in resolved output', async () => {
    const repoRoot = await makeTempGitRepo();
    const configPath = getRepoConfigPath(repoRoot);
    await fs.mkdir(path.dirname(configPath), { recursive: true });

    await writeJson(configPath, {
      schemaVersion: '0.1',
      stages: {
        plan: { engine: 'claude', model: 'opus', reasoning: 'high' },
        review: { engine: 'claude', model: 'opus', reasoning: 'high' }
      }
    });

    const resolved = await loadResolvedConfig(repoRoot);
    expect(resolved.config.stages?.plan?.engine).toBe('claude');
    expect(resolved.config.stages?.review?.model).toBe('opus');
  });
});
