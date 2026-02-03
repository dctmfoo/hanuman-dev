import fs from 'node:fs/promises';
import path from 'node:path';
import { writeJson } from '../lib/fs.js';
import type { Engine, EngineExecOptions, EngineExecResult } from './types.js';

function parseScenario(): string {
  return process.env.HANUMAN_FAKE_CODEX_SCENARIO ?? 'ok';
}

export const FakeCodexEngine: Engine = {
  name: 'fake-codex',

  async getVersion() {
    return 'fake-codex 0.0.0';
  },

  async getFeaturesBestEffort() {
    return ['fake', 'deterministic', 'for-tests'];
  },

  async execJsonl(opts: EngineExecOptions): Promise<EngineExecResult> {
    const scenario = parseScenario();

    // Ensure events dir exists
    await fs.mkdir(path.dirname(opts.eventsPath), { recursive: true });

    // A very small JSONL-ish stream: one or more lines.
    const lines: string[] = [];

    if (scenario === 'ok') {
      lines.push(JSON.stringify({ type: 'event', message: 'starting' }));
      lines.push(JSON.stringify({ status: 'ok', summary: 'done', filesChanged: [], testsRun: [] }));
      await fs.appendFile(opts.eventsPath, lines.join('\n') + '\n', 'utf8');
      return { code: 0, lastOutputJson: { status: 'ok', summary: 'done', filesChanged: [], testsRun: [] } };
    }

    if (scenario === 'no-json') {
      await fs.appendFile(opts.eventsPath, 'not-json\n', 'utf8');
      return { code: 0, lastOutputJson: undefined };
    }

    if (scenario === 'bad-json') {
      await fs.appendFile(opts.eventsPath, '{"status":\n', 'utf8');
      return { code: 0, lastOutputJson: undefined };
    }

    if (scenario === 'nonzero') {
      lines.push(JSON.stringify({ type: 'event', message: 'failing' }));
      await fs.appendFile(opts.eventsPath, lines.join('\n') + '\n', 'utf8');
      return { code: 2, stderrTail: 'fake failure' };
    }

    if (scenario === 'signal') {
      lines.push(JSON.stringify({ type: 'event', message: 'killed' }));
      await fs.appendFile(opts.eventsPath, lines.join('\n') + '\n', 'utf8');
      return { code: 1, signal: 'SIGKILL' };
    }

    // Default: ok
    lines.push(JSON.stringify({ status: 'ok', summary: 'done' }));
    await fs.appendFile(opts.eventsPath, lines.join('\n') + '\n', 'utf8');
    await writeJson(path.join(path.dirname(opts.eventsPath), 'fake-codex-debug.json'), { scenario, prompt: opts.prompt });
    return { code: 0, lastOutputJson: { status: 'ok', summary: 'done' } };
  }
};
