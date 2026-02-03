import fs from 'node:fs/promises';
import path from 'node:path';
import { readJson, writeJson } from '../lib/fs.js';
import type { RunDir } from '../run/runDir.js';
import type { RunJsonV01, StopReason } from '../run/types.js';
import { loadCheckpointState, saveCheckpointState } from '../run/checkpoints.js';
import { codexExecJsonl } from '../engines/codex.js';
import type { PrdV01 } from '../prd/schema.js';

export async function runExecutor(opts: {
  runDir: RunDir;
  run: RunJsonV01;
  prd: PrdV01;
  repoCwd: string;
}): Promise<{ stopReason: StopReason; exitCode: number; run: RunJsonV01 }> {
  const state = await loadCheckpointState(opts.runDir.checkpointStatePath);

  // IMPORTANT: On resume, run.json progress may be stale. Source of truth is the checkpoint.
  opts.run.progress.currentStoryIndex = state.currentStoryIndex;
  opts.run.progress.completedStoryIds = [...state.completedStoryIds];
  await writeJson(opts.runDir.runJsonPath, opts.run);

  let idx = state.currentStoryIndex;
  const completed = new Set(state.completedStoryIds);

  for (; idx < opts.prd.stories.length; idx++) {
    const story = opts.prd.stories[idx];
    if (completed.has(story.id)) continue;

    // checkpoint: about to run story
    await saveCheckpointState(opts.runDir.checkpointStatePath, {
      ...state,
      currentStoryIndex: idx,
      completedStoryIds: Array.from(completed)
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
      required: ['status', 'summary']
    };

    const prompt = `You are executing a single small story in a repo, Ralph-style.\n\nSTORY: ${story.id} — ${story.title}\nSIZE: ${story.size}\nACCEPTANCE:\n- ${story.acceptance.join('\n- ')}\n\nConstraints (if any):\n${(story.constraints ?? []).map((c) => `- ${c}`).join('\n') || '(none)'}\n\nRules:\n- Keep the change small and focused on this story only.\n- Prefer incremental commits are NOT required; just modify the working tree.\n- Run existing tests/linters only if quick; otherwise state what you'd run.\n- At the end, output a JSON object matching the provided output schema.\n`;

    let r;
    try {
      r = await codexExecJsonl({
        cwd: opts.repoCwd,
        prompt,
        eventsPath: opts.runDir.eventsPath,
        outputSchema,
        sandbox: opts.run.cli.sandbox,
        askForApproval: opts.run.cli.askForApproval,
        profile: opts.run.cli.profile,
        configOverrides: opts.run.cli.configOverrides
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
      codexExitCode: r.code,
      lastOutputJson: r.lastOutputJson
    });

    if (r.code !== 0) {
      return { stopReason: 'ENGINE_ERROR', exitCode: r.code || 1, run: opts.run };
    }

    completed.add(story.id);
    state.completedStoryIds = Array.from(completed);
    state.currentStoryIndex = idx + 1;
    await saveCheckpointState(opts.runDir.checkpointStatePath, state);

    // update run.json progress
    opts.run.progress.currentStoryIndex = state.currentStoryIndex;
    opts.run.progress.completedStoryIds = state.completedStoryIds;
    await writeJson(opts.runDir.runJsonPath, opts.run);
  }

  // mark finished
  // Source of truth for completion is the checkpoint state we just updated (or loaded on resume).
  opts.run.progress.currentStoryIndex = state.currentStoryIndex;
  opts.run.progress.completedStoryIds = Array.from(new Set(state.completedStoryIds));
  await writeJson(opts.runDir.runJsonPath, opts.run);

  // Write simple completion artifact
  await fs.writeFile(path.join(opts.runDir.artifactsDir, 'completed.txt'), 'completed\n', 'utf8');

  return { stopReason: 'SUCCESS', exitCode: 0, run: opts.run };
}

export async function loadPrd(prdPath: string): Promise<unknown> {
  return readJson(prdPath);
}
