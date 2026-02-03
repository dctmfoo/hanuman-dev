import path from 'node:path';
import fs from 'node:fs/promises';
import { fileExists, readJson, writeJson } from '../lib/fs.js';
import { execCapture } from '../lib/proc.js';
import { RepoConfigSchema, type RepoConfig } from './schema.js';

export type ResolvedConfig = {
  repoRoot: string;
  configPath: string;
  exists: boolean;
  config: RepoConfig;
  sources: {
    defaults: boolean;
    repoConfigPath?: string;
  };
};

export const DEFAULT_REPO_CONFIG: RepoConfig = {
  schemaVersion: '0.1',
  commands: {
    test: 'npm test',
    lint: 'npm run lint',
    build: 'npm run build'
  },
  boundaries: {
    neverTouch: ['node_modules/**', '.git/**', 'dist/**']
  },
  defaults: {
    sandbox: true,
    askForApproval: false
  }
};

export async function getRepoRoot(cwd: string): Promise<string> {
  const r = await execCapture('git', ['rev-parse', '--show-toplevel'], { cwd });
  if (r.code !== 0) throw new Error('Not a git repo');
  return r.stdout.trim();
}

export function getRepoConfigPath(repoRoot: string): string {
  return path.join(repoRoot, '.halo', 'hanuman-dev.json');
}

export async function loadResolvedConfig(cwd: string): Promise<ResolvedConfig> {
  const repoRoot = await getRepoRoot(cwd);
  const configPath = getRepoConfigPath(repoRoot);

  let cfg: RepoConfig = { ...DEFAULT_REPO_CONFIG };
  let exists = false;

  if (await fileExists(configPath)) {
    exists = true;
    const raw = await readJson<unknown>(configPath);
    const parsed = RepoConfigSchema.safeParse(raw);
    if (!parsed.success) {
      throw new Error(`Invalid repo config at ${configPath}: ${parsed.error}`);
    }
    cfg = {
      ...DEFAULT_REPO_CONFIG,
      ...parsed.data,
      commands: { ...DEFAULT_REPO_CONFIG.commands, ...parsed.data.commands },
      boundaries: { ...DEFAULT_REPO_CONFIG.boundaries, ...parsed.data.boundaries },
      defaults: { ...DEFAULT_REPO_CONFIG.defaults, ...parsed.data.defaults },
      stages: parsed.data.stages
        ? {
            ...parsed.data.stages,
            work: parsed.data.stages.work ? { ...parsed.data.stages.work } : undefined,
            plan: parsed.data.stages.plan ? { ...parsed.data.stages.plan } : undefined,
            review: parsed.data.stages.review ? { ...parsed.data.stages.review } : undefined
          }
        : undefined
    };
  }

  return {
    repoRoot,
    configPath,
    exists,
    config: cfg,
    sources: {
      defaults: true,
      repoConfigPath: exists ? configPath : undefined
    }
  };
}

export async function initRepoConfig(cwd: string): Promise<{ repoRoot: string; configPath: string; created: boolean }> {
  const repoRoot = await getRepoRoot(cwd);
  const configPath = getRepoConfigPath(repoRoot);
  const haloDir = path.dirname(configPath);

  await fs.mkdir(haloDir, { recursive: true });

  let created = false;
  if (!(await fileExists(configPath))) {
    await writeJson(configPath, DEFAULT_REPO_CONFIG);
    created = true;
  }

  // Create .halo/.gitignore (best-effort)
  const haloGitignore = path.join(haloDir, '.gitignore');
  if (!(await fileExists(haloGitignore))) {
    await fs.writeFile(haloGitignore, 'hanuman-dev.json\n', 'utf8');
  }

  return { repoRoot, configPath, created };
}
