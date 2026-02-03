import fs from 'node:fs/promises';
import path from 'node:path';

export async function ensureDir(p: string) {
  await fs.mkdir(p, { recursive: true });
}

/**
 * Atomic JSON write: write to a temp file in the same directory then rename.
 * This prevents partial/corrupt JSON when the process crashes mid-write.
 */
export async function atomicWriteJson(p: string, value: unknown) {
  const dir = path.dirname(p);
  await ensureDir(dir);
  const tmp = `${p}.tmp-${process.pid}-${Date.now()}`;
  const data = JSON.stringify(value, null, 2) + '\n';
  await fs.writeFile(tmp, data, 'utf8');
  await fs.rename(tmp, p);
}

/** Back-compat alias (prefer atomicWriteJson everywhere). */
export async function writeJson(p: string, value: unknown) {
  await atomicWriteJson(p, value);
}

export async function readJson<T>(p: string): Promise<T> {
  const raw = await fs.readFile(p, 'utf8');
  return JSON.parse(raw) as T;
}

export async function fileExists(p: string): Promise<boolean> {
  try {
    await fs.stat(p);
    return true;
  } catch {
    return false;
  }
}
