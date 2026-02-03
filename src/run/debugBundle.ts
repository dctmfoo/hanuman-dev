import fs from 'node:fs/promises';
import path from 'node:path';
import { ensureDir, writeJson } from '../lib/fs.js';
import { getDiffPatch, getStatusText } from '../git/git.js';
import type { RunJsonV01 } from './types.js';

export async function writeDebugBundle(opts: {
  debugDir: string;
  run: RunJsonV01;
  repoCwd: string;
  eventsPath: string;
  reason: string;
}) {
  await ensureDir(opts.debugDir);

  await writeJson(path.join(opts.debugDir, 'run.json'), opts.run);

  let status = '';
  let diff = '';
  try {
    status = await getStatusText(opts.repoCwd);
  } catch (e) {
    status = `failed to get git status: ${(e as Error).message}`;
  }

  try {
    diff = await getDiffPatch(opts.repoCwd);
  } catch (e) {
    diff = `failed to get git diff: ${(e as Error).message}`;
  }

  await fs.writeFile(path.join(opts.debugDir, 'git-status.txt'), status + '\n', 'utf8');
  await fs.writeFile(path.join(opts.debugDir, 'git-diff.patch'), diff + '\n', 'utf8');

  // tail events.jsonl (best-effort)
  try {
    const raw = await fs.readFile(opts.eventsPath, 'utf8');
    const lines = raw.trim().split('\n');
    const tail = lines.slice(Math.max(0, lines.length - 200)).join('\n');
    await fs.writeFile(path.join(opts.debugDir, 'events-tail.jsonl'), tail + (tail ? '\n' : ''), 'utf8');
  } catch (e) {
    await fs.writeFile(
      path.join(opts.debugDir, 'events-tail.jsonl'),
      `failed to read events: ${(e as Error).message}\n`,
      'utf8'
    );
  }

  const summary = `# Debug bundle\n\nReason: ${opts.reason}\nStopReason: ${opts.run.stopReason ?? 'unknown'}\nRun: ${opts.run.runId}\nCreated: ${opts.run.createdAt}\n`;
  await fs.writeFile(path.join(opts.debugDir, 'summary.md'), summary, 'utf8');
}
