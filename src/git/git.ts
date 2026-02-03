import { execCapture } from '../lib/proc.js';

export async function isGitRepo(cwd: string): Promise<boolean> {
  const r = await execCapture('git', ['rev-parse', '--is-inside-work-tree'], { cwd });
  return r.code === 0 && r.stdout.trim() === 'true';
}

export async function getHeadSha(cwd: string): Promise<string> {
  const r = await execCapture('git', ['rev-parse', 'HEAD'], { cwd });
  return r.stdout.trim();
}

export async function getBranch(cwd: string): Promise<string> {
  const r = await execCapture('git', ['rev-parse', '--abbrev-ref', 'HEAD'], { cwd });
  return r.stdout.trim();
}

export async function isWorktreeClean(cwd: string): Promise<boolean> {
  const r = await execCapture('git', ['status', '--porcelain'], { cwd });
  return r.code === 0 && r.stdout.trim().length === 0;
}

export async function fetchBestEffort(cwd: string): Promise<{ ok: boolean; stdout: string; stderr: string; code: number }> {
  const r = await execCapture('git', ['fetch', '--all', '--prune'], { cwd });
  return { ok: r.code === 0, stdout: r.stdout, stderr: r.stderr, code: r.code };
}

export async function getStatusText(cwd: string): Promise<string> {
  const r = await execCapture('git', ['status', '-sb'], { cwd });
  return (r.stdout + r.stderr).trim();
}

export async function getDiffPatch(cwd: string): Promise<string> {
  const r = await execCapture('git', ['diff'], { cwd });
  return (r.stdout + r.stderr).trim();
}
