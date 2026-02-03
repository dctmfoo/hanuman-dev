import fs from 'node:fs';
import { spawn } from 'node:child_process';

export type CodexExecOptions = {
  cwd: string;
  prompt: string;
  eventsPath: string;
  outputSchema?: object;
  sandbox: boolean;
  askForApproval: boolean;
  profile?: string;
  configOverrides: Record<string, string>;
  /** Kill the Codex process if it runs longer than this. */
  timeoutMs?: number;
};

export type CodexExecResult = {
  code: number;
  signal?: NodeJS.Signals;
  lastOutputJson?: unknown;
  stderrTail?: string;
};

export async function getCodexVersion(cwd: string): Promise<string | undefined> {
  try {
    const { execCapture } = await import('../lib/proc.js');
    const r = await execCapture('codex', ['--version'], { cwd });
    if (r.code !== 0) return undefined;
    return r.stdout.trim() || undefined;
  } catch {
    return undefined;
  }
}

export async function getCodexFeaturesBestEffort(cwd: string): Promise<string[] | undefined> {
  // NOTE: Codex CLI feature-list command may vary; treat as best-effort.
  // This must never throw (missing codex binary should not abort a run).
  try {
    const candidates: Array<{ cmd: string; args: string[] }> = [
      { cmd: 'codex', args: ['--help'] },
      { cmd: 'codex', args: ['help'] }
      // If/when Codex adds an explicit `features` command, add it here.
    ];

    const { execCapture } = await import('../lib/proc.js');

    for (const c of candidates) {
      const r = await execCapture(c.cmd, c.args, { cwd });
      if (r.code === 0) {
        const lines = r.stdout
          .split('\n')
          .map((l) => l.trim())
          .filter(Boolean)
          .slice(0, 200);
        return lines;
      }
    }
    return undefined;
  } catch {
    return undefined;
  }
}

export function codexExecJsonl(opts: CodexExecOptions): Promise<CodexExecResult> {
  return new Promise((resolve, reject) => {
    const args: string[] = ['exec', '--json'];

    if (opts.outputSchema) {
      args.push('--output-schema', JSON.stringify(opts.outputSchema));
    }

    if (opts.sandbox) args.push('--sandbox');
    if (opts.askForApproval) args.push('--ask-for-approval');

    if (opts.profile) {
      args.push('--profile', opts.profile);
    }

    for (const [k, v] of Object.entries(opts.configOverrides)) {
      args.push('-c', `${k}=${v}`);
    }

    // Codex usually takes the prompt as trailing arg; if not, we can switch to stdin later.
    args.push(opts.prompt);

    const child = spawn('codex', args, {
      cwd: opts.cwd,
      env: process.env,
      stdio: ['ignore', 'pipe', 'pipe']
    });

    const out = fs.createWriteStream(opts.eventsPath, { flags: 'a' });
    let stderr = '';
    let lastJson: unknown | undefined;

    // Buffer to avoid dropping JSON objects split across chunk boundaries.
    let carry = '';

    const timeoutMs = opts.timeoutMs ?? 30 * 60 * 1000;
    const timeout = setTimeout(() => {
      // Best-effort kill; executor will map signal -> non-zero.
      child.kill('SIGKILL');
    }, timeoutMs);
    timeout.unref?.();

    child.stdout.on('data', (d: Buffer) => {
      const text = d.toString();
      out.write(text);

      // best-effort parse: keep the last parseable JSON line as "final" output.
      // Codex event stream is JSONL; some lines may be non-JSON.
      const combined = carry + text;
      const parts = combined.split('\n');
      carry = parts.pop() ?? '';

      for (const line of parts) {
        const t = line.trim();
        if (!t) continue;
        try {
          lastJson = JSON.parse(t);
        } catch {
          // ignore
        }
      }
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

      // flush any remaining buffered line (might contain the final JSON object)
      const t = carry.trim();
      if (t) {
        try {
          lastJson = JSON.parse(t);
        } catch {
          // ignore
        }
      }

      out.end();

      // If terminated by signal, treat as non-zero (abort/failure) so the executor can generate debug bundles.
      const finalCode = code === null ? 1 : code;
      resolve({ code: finalCode, signal: signal ?? undefined, lastOutputJson: lastJson, stderrTail: stderr });
    });
  });
}
