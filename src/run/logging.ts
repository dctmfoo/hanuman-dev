import fs from 'node:fs/promises';
import type { RunDir } from './runDir.js';

export type RunLogLevel = 'info' | 'warn' | 'error';

export type RunLogEntry = {
  ts: string;
  level: RunLogLevel;
  event: string;
  runId?: string;
  message?: string;
  data?: Record<string, unknown>;
};

export type RunLogInput = {
  level?: RunLogLevel;
  event: string;
  message?: string;
  data?: Record<string, unknown>;
};

export function createRunLogger(runDir: RunDir) {
  const runId = runDir.runId;
  const logsPath = runDir.logsPath;

  return async (entry: RunLogInput): Promise<void> => {
    const payload: RunLogEntry = {
      ts: new Date().toISOString(),
      level: entry.level ?? 'info',
      event: entry.event,
      runId,
      ...(entry.message ? { message: entry.message } : {}),
      ...(entry.data ? { data: entry.data } : {})
    };

    try {
      await fs.appendFile(logsPath, JSON.stringify(payload) + '\n', 'utf8');
    } catch {
      // best-effort: logging must never break a run
    }
  };
}
