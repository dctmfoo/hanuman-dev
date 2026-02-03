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
};

export type CodexExecResult = {
  code: number;
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

    child.stdout.on('data', (d: Buffer) => {
      const text = d.toString();
      out.write(text);

      // best-effort parse: last JSON object line as "final" output
      // (codex event stream is JSONL; some lines may be non-JSON)
      for (const line of text.split('\n')) {
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
      out.end();
      reject(err);
    });

    child.on('close', (code: number | null) => {
      out.end();
      resolve({ code: code ?? 0, lastOutputJson: lastJson, stderrTail: stderr });
    });
  });
}
