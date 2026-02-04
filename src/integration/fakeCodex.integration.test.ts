import { beforeEach, describe, expect, it } from 'vitest';
import os from 'node:os';
import path from 'node:path';
import fs from 'node:fs/promises';
import { createRunDir } from '../run/runDir.js';
import type { RunJsonV01 } from '../run/types.js';
import { writeJson } from '../lib/fs.js';
import { runExecutor } from '../executor/executor.js';
import { FakeCodexEngine } from '../engines/fakeCodex.js';

async function makeTempRepo(): Promise<string> {
  const dir = await fs.mkdtemp(path.join(os.tmpdir(), 'hanuman-dev-repo-'));
  await fs.mkdir(path.join(dir, '.git'), { recursive: true });
  return dir;
}

async function ensureTempHaloHome(): Promise<void> {
  const dir = await fs.mkdtemp(path.join(os.tmpdir(), 'hanuman-halo-home-'));
  process.env.HALO_HOME = dir;
}

const prd = {
  schemaVersion: '0.1',
  title: 'Test PRD',
  stories: [
    { id: 'S1', title: 'Story 1', size: 'S', acceptance: ['ok'] },
    { id: 'S2', title: 'Story 2', size: 'S', acceptance: ['ok'] }
  ]
} as const;

describe('integration: executor with fake codex', () => {
  beforeEach(async () => {
    await ensureTempHaloHome();
  });

  it('marks success when fake codex emits valid output', async () => {
    process.env.HANUMAN_FAKE_CODEX_SCENARIO = 'ok';

    const repoCwd = await makeTempRepo();
    const runDir = await createRunDir({ title: 'itest', contractVersion: '0.1' });

    const run: RunJsonV01 = {
      ...(await (await import('../lib/fs.js')).readJson<RunJsonV01>(runDir.runJsonPath)),
      cli: {
        argv: [],
        sandbox: false,
        askForApproval: false,
        configOverrides: {}
      },
      repo: { path: repoCwd }
    };
    await writeJson(runDir.runJsonPath, run);

    const res = await runExecutor({ runDir, run, prd: prd as any, repoCwd, engine: FakeCodexEngine });
    expect(res.stopReason).toBe('SUCCESS');
    expect(res.exitCode).toBe(0);

    const artifacts = await fs.readdir(runDir.artifactsDir);
    expect(artifacts.some((f) => f.includes('S1'))).toBe(true);
    expect(artifacts.some((f) => f.includes('S2'))).toBe(true);

    const events = await fs.readFile(runDir.eventsPath, 'utf8');
    expect(events.length).toBeGreaterThan(0);
  });

  it('resumes from nextStoryId without rerunning completed stories', async () => {
    process.env.HANUMAN_FAKE_CODEX_SCENARIO = 'ok';

    const repoCwd = await makeTempRepo();
    const runDir = await createRunDir({ title: 'itest', contractVersion: '0.1' });

    const run: RunJsonV01 = {
      ...(await (await import('../lib/fs.js')).readJson<RunJsonV01>(runDir.runJsonPath)),
      cli: {
        argv: [],
        sandbox: false,
        askForApproval: false,
        configOverrides: {}
      },
      repo: { path: repoCwd }
    };
    await writeJson(runDir.runJsonPath, run);

    // Pretend story S1 already completed.
    await writeJson(runDir.checkpointStatePath, {
      contractVersion: '0.1',
      runId: runDir.runId,
      currentStoryIndex: 0,
      completedStoryIds: ['S1'],
      nextStoryId: 'S2',
      updatedAt: new Date().toISOString()
    });

    const res = await runExecutor({ runDir, run, prd: prd as any, repoCwd, engine: FakeCodexEngine });
    expect(res.stopReason).toBe('SUCCESS');

    const artifacts = await fs.readdir(runDir.artifactsDir);
    // should only execute S2
    expect(artifacts.some((f) => f.includes('S1'))).toBe(false);
    expect(artifacts.some((f) => f.includes('S2'))).toBe(true);
  });

  it('migrates legacy index-only checkpoint (empty completedStoryIds) using currentStoryIndex', async () => {
    process.env.HANUMAN_FAKE_CODEX_SCENARIO = 'ok';

    const repoCwd = await makeTempRepo();
    const runDir = await createRunDir({ title: 'itest', contractVersion: '0.1' });

    const run: RunJsonV01 = {
      ...(await (await import('../lib/fs.js')).readJson<RunJsonV01>(runDir.runJsonPath)),
      cli: { argv: [], sandbox: false, askForApproval: false, configOverrides: {} },
      repo: { path: repoCwd }
    };
    await writeJson(runDir.runJsonPath, run);

    // Legacy: only index tracked, completedStoryIds empty.
    await writeJson(runDir.checkpointStatePath, {
      contractVersion: '0.1',
      runId: runDir.runId,
      currentStoryIndex: 1,
      completedStoryIds: [],
      updatedAt: new Date().toISOString()
    });

    const res = await runExecutor({ runDir, run, prd: prd as any, repoCwd, engine: FakeCodexEngine });
    expect(res.stopReason).toBe('SUCCESS');

    const artifacts = await fs.readdir(runDir.artifactsDir);
    // should execute only S2 (index=1), not S1
    expect(artifacts.some((f) => f.includes('S1'))).toBe(false);
    expect(artifacts.some((f) => f.includes('S2'))).toBe(true);
  });

  it('fails when fake codex emits no machine-checkable output', async () => {
    process.env.HANUMAN_FAKE_CODEX_SCENARIO = 'no-json';

    const repoCwd = await makeTempRepo();
    const runDir = await createRunDir({ title: 'itest', contractVersion: '0.1' });

    const run: RunJsonV01 = {
      ...(await (await import('../lib/fs.js')).readJson<RunJsonV01>(runDir.runJsonPath)),
      cli: {
        argv: [],
        sandbox: false,
        askForApproval: false,
        configOverrides: {}
      },
      repo: { path: repoCwd }
    };
    await writeJson(runDir.runJsonPath, run);

    const res = await runExecutor({ runDir, run, prd: prd as any, repoCwd, engine: FakeCodexEngine });
    expect(res.stopReason).toBe('ENGINE_ERROR');
    expect(res.exitCode).toBe(1);
  });
});
