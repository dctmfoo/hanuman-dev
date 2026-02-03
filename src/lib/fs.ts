import fs from 'node:fs/promises';
import path from 'node:path';

export async function ensureDir(p: string) {
  await fs.mkdir(p, { recursive: true });
}

export async function writeJson(p: string, value: unknown) {
  await ensureDir(path.dirname(p));
  await fs.writeFile(p, JSON.stringify(value, null, 2) + '\n', 'utf8');
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
