#!/usr/bin/env node

import { Command } from 'commander';
import path from 'node:path';
import { createRunDir, loadRunDir } from './run/runDir.js';
import { readJson, writeJson } from './lib/fs.js';
import { validatePrdConservative } from './executor/validator.js';
import { loadPrd, runExecutor } from './executor/executor.js';
import { fetchBestEffort, getBranch, getHeadSha, isGitRepo, isWorktreeClean } from './git/git.js';
import { getCodexFeaturesBestEffort, getCodexVersion } from './engines/codex.js';
import { writeDebugBundle } from './run/debugBundle.js';
import type { RunJsonV01, StopReason } from './run/types.js';
import fs from 'node:fs/promises';
import { sha256Hex } from './lib/hash.js';

const program = new Command();

program
  .name('hanuman-dev')
  .description('Repo-agnostic, replayable Ralph-style executor (Codex-first).')
  .version('0.1.0');

program
  .command('init')
  .description('Initialize .halo/config.json in the current repo (stub).')
  .action(() => {
    console.log('init: TODO (will create .halo/config.json + helper scripts)');
  });

program
  .command('run')
  .description('Run a checkpointed PRD (v0.1).')
  .requiredOption('--prd <path>', 'Path to prd.json')
  .option('--resume <runDir>', 'Resume from an existing run directory')
  .option('--sandbox', 'Run Codex in sandbox mode', false)
  .option('--ask-for-approval', 'Ask for approvals during Codex execution', false)
  .option('--profile <name>', 'Codex profile name')
  .option('-c, --config <keyValue...>', 'Config overrides (key=value)', [])
  .action(async (opts) => {
    let stopReason: StopReason = 'UNKNOWN_ERROR';
    let exitCode = 1;

    const configOverrides: Record<string, string> = {};
    for (const kv of opts.config as string[]) {
      const [k, ...rest] = kv.split('=');
      if (!k || rest.length === 0) continue;
      configOverrides[k] = rest.join('=');
    }

    const prdPath = path.resolve(opts.prd);
    const cwd = process.cwd();

    // NOTE: init (create/load run dir + read run.json) must be inside the try.
    // Otherwise invalid --resume paths or malformed run.json will crash without stopReason/debug bundle.
    let runDir: Awaited<ReturnType<typeof createRunDir>> | undefined;
    let runJson: RunJsonV01 | undefined;

    try {
      runDir = opts.resume
        ? await loadRunDir(path.resolve(opts.resume))
        : await createRunDir({ title: 'hanuman-dev-run', contractVersion: '0.1' });

      runJson = await readJson<RunJsonV01>(runDir.runJsonPath);

      runJson.startedAt = new Date().toISOString();
      runJson.startTime = runJson.startedAt;
      runJson.cli.prdPath = prdPath;
      runJson.cli.resumeFrom = opts.resume ? path.resolve(opts.resume) : undefined;
      runJson.cli.sandbox = Boolean(opts.sandbox);
      runJson.cli.askForApproval = Boolean(opts.askForApproval);
      runJson.cli.profile = opts.profile;
      runJson.cli.configOverrides = configOverrides;

      runJson.repo.path = cwd;

      // Validate PRD early (especially important on resume) before polluting run metadata.
      const prdRawText = await fs.readFile(prdPath, 'utf8');
      const prdHash = sha256Hex(prdRawText);

      // On resume, refuse to run against a different PRD than the one recorded.
      if (opts.resume && runJson.prd?.sha256 && runJson.prd.sha256 !== prdHash) {
        stopReason = 'VALIDATION_FAILED';
        throw new Error(
          `PRD mismatch on resume. run.json has sha256=${runJson.prd.sha256} but current file is sha256=${prdHash}. ` +
            `Refusing to resume to preserve deterministic semantics.`
        );
      }

      let raw: unknown;
      try {
        raw = JSON.parse(prdRawText) as unknown;
      } catch (e) {
        stopReason = 'VALIDATION_FAILED';
        throw new Error(`Invalid PRD JSON: ${(e as Error).message}`);
      }

      const v = validatePrdConservative(raw);
      if (!v.ok) {
        stopReason = 'VALIDATION_FAILED';
        throw new Error(v.error);
      }

      runJson.prd = {
        schemaVersion: v.prd.schemaVersion,
        title: v.prd.title,
        storyCount: v.prd.stories.length,
        sha256: prdHash
      };
      await writeJson(runDir.runJsonPath, runJson);

      // Repo checks / metadata
      const isRepo = await isGitRepo(cwd);
      if (!isRepo) {
        stopReason = 'NOT_A_GIT_REPO';
        throw new Error('Not a git repo');
      }

      const clean = await isWorktreeClean(cwd);
      if (!clean) {
        stopReason = 'DIRTY_WORKTREE';
        throw new Error('Worktree is dirty');
      }

      runJson.repo.branch = await getBranch(cwd);
      runJson.repo.headSha = await getHeadSha(cwd);
      runJson.repo.fetch = await fetchBestEffort(cwd);

      runJson.codex.version = await getCodexVersion(cwd);
      runJson.codex.features = await getCodexFeaturesBestEffort(cwd);
      if (!runJson.codex.version) runJson.codex.notes?.push('codex --version unavailable');
      if (!runJson.codex.features) runJson.codex.notes?.push('codex features list unavailable (best-effort)');

      await writeJson(runDir.runJsonPath, runJson);

      const result = await runExecutor({ runDir, run: runJson, prd: v.prd, repoCwd: cwd });
      stopReason = result.stopReason;
      exitCode = result.exitCode;

      runJson.stopReason = stopReason;
      runJson.exitCode = exitCode;
      runJson.exitStatus = exitCode;
      runJson.finishedAt = new Date().toISOString();
      runJson.endTime = runJson.finishedAt;
      await writeJson(runDir.runJsonPath, runJson);

      if (exitCode !== 0) {
        await writeDebugBundle({
          debugDir: runDir.debugBundleDir,
          run: runJson,
          repoCwd: cwd,
          eventsPath: runDir.eventsPath,
          reason: 'executor failed'
        });
      }

      console.log(runDir.root);
      process.exit(exitCode);
    } catch (err) {
      const e = err as Error;

      // If init failed before we had a valid run dir, create a fallback run dir so we can
      // still honor the v0.1 contract (explicit stopReason + debug bundle).
      if (!runDir || !runJson) {
        stopReason = stopReason === 'UNKNOWN_ERROR' ? 'VALIDATION_FAILED' : stopReason;
        runDir = await createRunDir({ title: 'hanuman-dev-init-failure', contractVersion: '0.1' });
        runJson = await readJson<RunJsonV01>(runDir.runJsonPath);
        runJson.repo.path = cwd;
        runJson.startedAt = runJson.startedAt ?? new Date().toISOString();
        runJson.startTime = runJson.startTime ?? runJson.startedAt;
        runJson.cli.prdPath = prdPath;
        runJson.cli.resumeFrom = opts.resume ? path.resolve(opts.resume) : undefined;
        runJson.cli.sandbox = Boolean(opts.sandbox);
        runJson.cli.askForApproval = Boolean(opts.askForApproval);
        runJson.cli.profile = opts.profile;
        runJson.cli.configOverrides = configOverrides;
      }

      runJson.stopReason = stopReason;
      runJson.exitCode = exitCode;
      runJson.exitStatus = exitCode;
      runJson.error = { message: e.message, stack: e.stack };
      runJson.finishedAt = new Date().toISOString();
      runJson.endTime = runJson.finishedAt;
      await writeJson(runDir.runJsonPath, runJson);

      await writeDebugBundle({
        debugDir: runDir.debugBundleDir,
        run: runJson,
        repoCwd: cwd,
        eventsPath: runDir.eventsPath,
        reason: e.message
      });

      console.error(`hanuman-dev failed: ${stopReason}: ${e.message}`);
      console.error(runDir.root);
      process.exit(exitCode);
    }
  });

program.parse();
