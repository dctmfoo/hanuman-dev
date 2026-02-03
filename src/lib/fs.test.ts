import { describe, expect, it } from 'vitest';
import os from 'node:os';
import path from 'node:path';
import fs from 'node:fs/promises';
import { atomicWriteJson, readJson } from './fs.js';

describe('atomicWriteJson', () => {
  it('writes valid JSON and overwrites atomically (best-effort)', async () => {
    const dir = await fs.mkdtemp(path.join(os.tmpdir(), 'hanuman-dev-'));
    const p = path.join(dir, 'run.json');

    await atomicWriteJson(p, { a: 1 });
    expect(await readJson<{ a: number }>(p)).toEqual({ a: 1 });

    await atomicWriteJson(p, { a: 2, b: 'x' });
    expect(await readJson<{ a: number; b: string }>(p)).toEqual({ a: 2, b: 'x' });
  });
});
