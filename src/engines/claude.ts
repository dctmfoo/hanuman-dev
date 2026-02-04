import fs from 'node:fs';
import path from 'node:path';
import { spawn } from 'node:child_process';
import type { Engine, EngineExecOptions, EngineExecResult } from './types.js';

const DEFAULT_MODEL = 'opus';
const DEFAULT_TIMEOUT_MS = 30 * 60 * 1000;

function buildPrompt(opts: EngineExecOptions): string {
  if (!opts.outputSchema) return opts.prompt;
  const schemaText = JSON.stringify(opts.outputSchema, null, 2);
  return (
    `${opts.prompt}\n\n` +
    'Return only JSON that strictly matches this schema. Do not include extra keys or prose.\n' +
    `SCHEMA:\n${schemaText}\n`
  );
}

function parseJsonFromText(text: string): unknown | undefined {
  const trimmed = text.trim();
  if (!trimmed) return undefined;
  try {
    return JSON.parse(trimmed);
  } catch {
    // fall through
  }

  let lastLineJson: unknown | undefined;
  for (const line of trimmed.split('\n')) {
    const t = line.trim();
    if (!t) continue;
    try {
      lastLineJson = JSON.parse(t);
    } catch {
      // ignore
    }
  }
  if (lastLineJson !== undefined) return lastLineJson;

  const firstBrace = trimmed.indexOf('{');
  const lastBrace = trimmed.lastIndexOf('}');
  if (firstBrace >= 0 && lastBrace > firstBrace) {
    const slice = trimmed.slice(firstBrace, lastBrace + 1);
    try {
      return JSON.parse(slice);
    } catch {
      // ignore
    }
  }

  return undefined;
}

export async function getClaudeVersion(cwd: string): Promise<string | undefined> {
  try {
    const { execCapture } = await import('../lib/proc.js');
    const r = await execCapture('claude', ['--version'], { cwd });
    if (r.code !== 0) return undefined;
    return r.stdout.trim() || undefined;
  } catch {
    return undefined;
  }
}

export async function getClaudeFeaturesBestEffort(cwd: string): Promise<string[] | undefined> {
  try {
    const { execCapture } = await import('../lib/proc.js');
    const r = await execCapture('claude', ['--help'], { cwd });
    if (r.code !== 0) return undefined;
    return r.stdout
      .split('\n')
      .map((l) => l.trim())
      .filter(Boolean)
      .slice(0, 200);
  } catch {
    return undefined;
  }
}

export function claudeExecJsonl(opts: EngineExecOptions): Promise<EngineExecResult> {
  return new Promise((resolve, reject) => {
    const args: string[] = ['--model', DEFAULT_MODEL, '--print'];

    // Ensure events dir exists
    try {
      fs.mkdirSync(path.dirname(opts.eventsPath), { recursive: true });
    } catch (e) {
      return reject(e);
    }

    const child = spawn('claude', args, {
      cwd: opts.cwd,
      env: process.env,
      stdio: ['pipe', 'pipe', 'pipe']
    });

    const out = fs.createWriteStream(opts.eventsPath, { flags: 'a' });
    out.on('error', (err) => {
      clearTimeout(timeout);
      reject(err);
    });

    let stdout = '';
    let stderr = '';

    const timeoutMs = opts.timeoutMs ?? DEFAULT_TIMEOUT_MS;
    const timeout = setTimeout(() => {
      child.kill('SIGKILL');
    }, timeoutMs);
    timeout.unref?.();

    child.stdout.on('data', (d: Buffer) => {
      const text = d.toString();
      stdout += text;
      out.write(text);
    });

    child.stderr.on('data', (d: Buffer) => {
      stderr += d.toString();
      if (stderr.length > 4000) stderr = stderr.slice(-4000);
    });

    child.on('error', (err: Error) => {
      clearTimeout(timeout);
      out.end();
      reject(err);
    });

    child.on('close', (code: number | null, signal: NodeJS.Signals | null) => {
      clearTimeout(timeout);
      out.end();

      const finalCode = code === null ? 1 : code;
      const outputJson = parseJsonFromText(stdout);

      resolve({
        code: finalCode,
        signal: signal ?? undefined,
        lastOutputJson: outputJson,
        stderrTail: stderr
      });
    });

    const prompt = buildPrompt(opts);
    child.stdin.write(prompt);
    child.stdin.end();
  });
}

export const ClaudeEngine: Engine = {
  name: 'claude',
  execJsonl: claudeExecJsonl,
  getVersion: getClaudeVersion,
  getFeaturesBestEffort: getClaudeFeaturesBestEffort
};
