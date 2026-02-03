import { readJson, writeJson } from '../lib/fs.js';
import type { CheckpointStateV01 } from './types.js';

export async function loadCheckpointState(path: string): Promise<CheckpointStateV01> {
  return readJson<CheckpointStateV01>(path);
}

export async function saveCheckpointState(path: string, state: CheckpointStateV01): Promise<void> {
  await writeJson(path, { ...state, updatedAt: new Date().toISOString() });
}
