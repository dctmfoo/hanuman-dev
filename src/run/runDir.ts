import path from 'node:path';
import crypto from 'node:crypto';
import fs from 'node:fs/promises';
import { ensureDir, fileExists, readJson, writeJson } from '../lib/fs.js';
import { getHaloHome, slugify } from '../lib/paths.js';
import type { CheckpointStateV01, RunJsonV01 } from './types.js';

export type RunDir = {
  runId: string;
  root: string;
  runJsonPath: string;
  eventsPath: string;
  checkpointsDir: string;
  artifactsDir: string;
  debugBundleDir: string;
  checkpointStatePath: string;
};

export function computeRunId(title?: string) {
  const ts = new Date().toISOString().replace(/[:.]/g, '-');
  const rand = crypto.randomBytes(3).toString('hex');
  const slug = title ? slugify(title) : 'run';
  return `${ts}-${slug}-${rand}`;
}

export async function createRunDir(params: { title?: string; contractVersion: '0.1' }): Promise<RunDir> {
  const runId = computeRunId(params.title);
  const root = path.join(getHaloHome(), 'runs', runId);
  const rd: RunDir = {
    runId,
    root,
    runJsonPath: path.join(root, 'run.json'),
    eventsPath: path.join(root, 'events.jsonl'),
    checkpointsDir: path.join(root, 'checkpoints'),
    artifactsDir: path.join(root, 'artifacts'),
    debugBundleDir: path.join(root, 'debug_bundle'),
    checkpointStatePath: path.join(root, 'checkpoints', 'state.json')
  };

  await ensureDir(rd.root);
  await ensureDir(rd.checkpointsDir);
  await ensureDir(rd.artifactsDir);
  await ensureDir(rd.debugBundleDir);
  await fs.writeFile(rd.eventsPath, '', { encoding: 'utf8' });

  const initRun: RunJsonV01 = {
    contractVersion: params.contractVersion,
    runId,
    title: params.title,
    createdAt: new Date().toISOString(),
    cwd: process.cwd(),
    repo: { path: process.cwd() },
    codex: { notes: [] },
    cli: {
      argv: process.argv,
      sandbox: false,
      askForApproval: false,
      configOverrides: {}
    },
    progress: { currentStoryIndex: 0, completedStoryIds: [] }
  };
  await writeJson(rd.runJsonPath, initRun);

  const cp: CheckpointStateV01 = {
    contractVersion: params.contractVersion,
    runId,
    currentStoryIndex: 0,
    completedStoryIds: [],
    updatedAt: new Date().toISOString()
  };
  await writeJson(rd.checkpointStatePath, cp);

  return rd;
}

export async function loadRunDir(root: string): Promise<RunDir> {
  const runJsonPath = path.join(root, 'run.json');
  if (!(await fileExists(runJsonPath))) throw new Error(`Not a run dir: missing ${runJsonPath}`);

  const run = await readJson<RunJsonV01>(runJsonPath);
  const rd: RunDir = {
    runId: run.runId,
    root,
    runJsonPath,
    eventsPath: path.join(root, 'events.jsonl'),
    checkpointsDir: path.join(root, 'checkpoints'),
    artifactsDir: path.join(root, 'artifacts'),
    debugBundleDir: path.join(root, 'debug_bundle'),
    checkpointStatePath: path.join(root, 'checkpoints', 'state.json')
  };

  await ensureDir(rd.checkpointsDir);
  await ensureDir(rd.artifactsDir);
  await ensureDir(rd.debugBundleDir);

  return rd;
}
