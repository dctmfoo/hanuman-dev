import { spawn } from 'node:child_process';

export type ExecResult = {
  code: number;
  signal?: NodeJS.Signals;
  stdout: string;
  stderr: string;
};

export function execCapture(cmd: string, args: string[], opts?: { cwd?: string; env?: NodeJS.ProcessEnv }): Promise<ExecResult> {
  return new Promise((resolve, reject) => {
    const child = spawn(cmd, args, {
      cwd: opts?.cwd,
      env: { ...process.env, ...opts?.env },
      stdio: ['ignore', 'pipe', 'pipe']
    });

    let stdout = '';
    let stderr = '';
    child.stdout.on('data', (d: Buffer) => (stdout += d.toString()));
    child.stderr.on('data', (d: Buffer) => (stderr += d.toString()));

    child.on('error', reject);
    child.on('close', (code: number | null, signal: NodeJS.Signals | null) => {
      // If a subprocess is terminated by signal, treat it as a failure.
      const finalCode = code === null ? 1 : code;
      resolve({ code: finalCode, signal: signal ?? undefined, stdout, stderr });
    });
  });
}
