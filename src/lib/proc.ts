import { spawn } from 'node:child_process';

export type ExecResult = {
  code: number;
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
    child.on('close', (code: number | null) => {
      resolve({ code: code ?? 0, stdout, stderr });
    });
  });
}
