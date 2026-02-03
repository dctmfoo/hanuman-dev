import fs from 'node:fs/promises';
import path from 'node:path';
import { readJson, writeJson } from '../lib/fs.js';
import type { RunDir } from '../run/runDir.js';
import type { RunJsonV01, StopReason } from '../run/types.js';
import { loadCheckpointState, saveCheckpointState } from '../run/checkpoints.js';
import { codexExecJsonl } from '../engines/codex.js';
import { FakeCodexEngine } from '../engines/fakeCodex.js';
import type { Engine } from '../engines/types.js';
import type { PrdV01 } from '../prd/schema.js';

export async function runExecutor(opts: {
  runDir: RunDir;
  run: RunJsonV01;
  prd: PrdV01;
  repoCwd: string;
  engine?: Engine;
}): Promise<{ stopReason: StopReason; exitCode: number; run: RunJsonV01 }> {
  const state = await loadCheckpointState(opts.runDir.checkpointStatePath);

  const engine: Engine =
    opts.engine ?? (process.env.HANUMAN_ENGINE === 'fake-codex' ? FakeCodexEngine : { name: 'codex', execJsonl: codexExecJsonl });

  const completed = new Set(state.completedStoryIds);

  // Determine next story based on identity, not array index.
  const computeNextStoryId = (): string | null => {
    for (const s of opts.prd.stories) {
      if (!completed.has(s.id)) return s.id;
    }
    return null;
  };

  // Migrate old checkpoints (index-based) to nextStoryId for deterministic resume.
  // Older checkpoints may have only currentStoryIndex with stale/empty completedStoryIds.
  if (state.nextStoryId === undefined) {
    if (state.completedStoryIds.length === 0 && state.currentStoryIndex > 0) {
      // Best-effort migration: assume stories before currentStoryIndex were completed.
      const assumedCompleted = opts.prd.stories.slice(0, state.currentStoryIndex).map((s) => s.id);
      for (const id of assumedCompleted) completed.add(id);
      state.completedStoryIds = Array.from(completed);
      state.nextStoryId = opts.prd.stories[state.currentStoryIndex]?.id ?? null;
    } else {
      state.nextStoryId = computeNextStoryId();
    }

    // best-effort index mirror
    state.currentStoryIndex = state.nextStoryId
      ? Math.max(0, opts.prd.stories.findIndex((s) => s.id === state.nextStoryId))
      : opts.prd.stories.length;

    await saveCheckpointState(opts.runDir.checkpointStatePath, state);
  }

  // IMPORTANT: On resume, run.json progress may be stale. Source of truth is the checkpoint.
  opts.run.progress.completedStoryIds = Array.from(completed);
  opts.run.progress.nextStoryId = state.nextStoryId ?? computeNextStoryId();
  opts.run.progress.currentStoryIndex = opts.run.progress.nextStoryId
    ? Math.max(0, opts.prd.stories.findIndex((s) => s.id === opts.run.progress.nextStoryId))
    : opts.prd.stories.length;
  await writeJson(opts.runDir.runJsonPath, opts.run);

  // Always compute the next story dynamically from completed story IDs.
  for (;;) {
    const nextId = computeNextStoryId();
    if (!nextId) break;

    const idx = opts.prd.stories.findIndex((s) => s.id === nextId);
    if (idx < 0) return { stopReason: 'VALIDATION_FAILED', exitCode: 1, run: opts.run };

    const story = opts.prd.stories[idx];

    // checkpoint: about to run story
    await saveCheckpointState(opts.runDir.checkpointStatePath, {
      ...state,
      currentStoryIndex: idx,
      completedStoryIds: Array.from(completed),
      nextStoryId: story.id
    });

    const outputSchema = {
      type: 'object',
      additionalProperties: false,
      properties: {
        status: { type: 'string', enum: ['ok', 'needs_human', 'failed'] },
        summary: { type: 'string' },
        filesChanged: { type: 'array', items: { type: 'string' } },
        testsRun: { type: 'array', items: { type: 'string' } },
        notes: { type: 'array', items: { type: 'string' } }
      },
      // codex-cli output schema validation requires `required` to include every key in `properties`.
      required: ['status', 'summary', 'filesChanged', 'testsRun', 'notes']
    };

    const prompt = `You are executing a single small story in a repo, Ralph-style.\n\nSTORY: ${story.id} — ${story.title}\nSIZE: ${story.size}\nACCEPTANCE:\n- ${story.acceptance.join('\n- ')}\n\nConstraints (if any):\n${(story.constraints ?? []).map((c) => `- ${c}`).join('\n') || '(none)'}\n\nRules:\n- Keep the change small and focused on this story only.\n- Prefer incremental commits are NOT required; just modify the working tree.\n- Run existing tests/linters only if quick; otherwise state what you'd run.\n- At the end, output a JSON object matching the provided output schema.\n`;

    let r;
    try {
      r = await engine.execJsonl({
        cwd: opts.repoCwd,
        prompt,
        eventsPath: opts.runDir.eventsPath,
        outputSchema,
        sandbox: opts.run.cli.sandbox,
        askForApproval: opts.run.cli.askForApproval,
        profile: opts.run.cli.profile,
        configOverrides: opts.run.cli.configOverrides,
        timeoutMs: 30 * 60 * 1000
      });
    } catch (e) {
      // Missing codex binary / spawn errors should be classified as engine errors.
      return {
        stopReason: 'ENGINE_ERROR',
        exitCode: 1,
        run: {
          ...opts.run,
          error: { message: (e as Error).message, stack: (e as Error).stack }
        }
      };
    }

    // Persist per-story artifact
    const storyArtifactPath = path.join(opts.runDir.artifactsDir, `story-${idx + 1}-${story.id}.json`);
    await writeJson(storyArtifactPath, {
      story,
      engine: engine.name,
      exitCode: r.code,
      signal: r.signal,
      lastOutputJson: r.lastOutputJson
    });

    if (r.code !== 0) {
      return { stopReason: 'ENGINE_ERROR', exitCode: r.code || 1, run: opts.run };
    }

    // Enforce machine-checkable output per step (v0.1): must have a parseable final output.
    const out = r.lastOutputJson as any;
    const ok =
      out &&
      typeof out === 'object' &&
      typeof out.summary === 'string' &&
      (out.status === 'ok' || out.status === 'needs_human' || out.status === 'failed');
    if (!ok) {
      return {
        stopReason: 'ENGINE_ERROR',
        exitCode: 1,
        run: {
          ...opts.run,
          error: { message: 'Codex produced no valid JSON output matching the expected schema.' }
        }
      };
    }

    completed.add(story.id);
    state.completedStoryIds = Array.from(completed);
    state.nextStoryId = computeNextStoryId();

    // best-effort index mirror (legacy)
    state.currentStoryIndex = state.nextStoryId ? Math.max(0, opts.prd.stories.findIndex((s) => s.id === state.nextStoryId)) : opts.prd.stories.length;

    await saveCheckpointState(opts.runDir.checkpointStatePath, state);

    // update run.json progress
    opts.run.progress.completedStoryIds = state.completedStoryIds;
    opts.run.progress.nextStoryId = state.nextStoryId;
    opts.run.progress.currentStoryIndex = state.currentStoryIndex;
    await writeJson(opts.runDir.runJsonPath, opts.run);
  }

  // mark finished
  state.nextStoryId = null;
  state.currentStoryIndex = opts.prd.stories.length;
  await saveCheckpointState(opts.runDir.checkpointStatePath, state);

  // Source of truth for completion is the checkpoint state we just updated (or loaded on resume).
  opts.run.progress.currentStoryIndex = state.currentStoryIndex;
  opts.run.progress.completedStoryIds = Array.from(new Set(state.completedStoryIds));
  opts.run.progress.nextStoryId = null;
  await writeJson(opts.runDir.runJsonPath, opts.run);

  // Write simple completion artifact
  await fs.writeFile(path.join(opts.runDir.artifactsDir, 'completed.txt'), 'completed\n', 'utf8');

  return { stopReason: 'SUCCESS', exitCode: 0, run: opts.run };
}

export async function loadPrd(prdPath: string): Promise<unknown> {
  return readJson(prdPath);
}
