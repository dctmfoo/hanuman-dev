import { promises as fs } from 'node:fs';
import path from 'node:path';

import {
  extractDocsSection,
  extractGoldenCommandsSection,
  findGoldenCommands,
  findRelativeLinks,
} from './docs-readiness.js';
import { fileExists } from './fs.js';

export type ReadinessCheckResult = {
  id: string;
  label: string;
  ok: boolean;
  details?: string;
};

export type ReadinessReport = {
  ok: boolean;
  total: number;
  passed: number;
  failed: number;
  results: ReadinessCheckResult[];
};

type ReadinessCheck = {
  id: string;
  label: string;
  run: (rootDir: string) => Promise<ReadinessCheckResult>;
};

const DOCS_README_CANDIDATES = ['docs/README.md', 'docs/README'];

async function readFirstExisting(
  rootDir: string,
  candidates: string[],
): Promise<{ path: string; content: string } | null> {
  for (const candidate of candidates) {
    const fullPath = path.join(rootDir, candidate);
    try {
      const content = await fs.readFile(fullPath, 'utf8');
      return { path: fullPath, content };
    } catch {
      // continue
    }
  }
  return null;
}

async function checkReadmeDocsSection(rootDir: string): Promise<ReadinessCheckResult> {
  const id = 'readme-docs';
  const label = 'README docs section with links';
  const readmePath = path.join(rootDir, 'README.md');

  let readme: string;
  try {
    readme = await fs.readFile(readmePath, 'utf8');
  } catch {
    return { id, label, ok: false, details: 'missing README.md' };
  }

  const docsSection = extractDocsSection(readme);
  if (!docsSection) {
    return { id, label, ok: false, details: 'missing "## Docs" section' };
  }

  const links = findRelativeLinks(docsSection);
  if (links.length === 0) {
    return { id, label, ok: false, details: 'no relative links in "## Docs" section' };
  }

  return { id, label, ok: true };
}

async function checkDocsGoldenCommands(rootDir: string): Promise<ReadinessCheckResult> {
  const id = 'docs-golden-commands';
  const label = 'Docs golden commands configured';
  const docsReadme = await readFirstExisting(rootDir, DOCS_README_CANDIDATES);

  if (!docsReadme) {
    return { id, label, ok: false, details: 'missing docs/README.md' };
  }

  const relativePath = path.relative(rootDir, docsReadme.path) || 'docs/README.md';
  const section = extractGoldenCommandsSection(docsReadme.content);
  if (!section) {
    return {
      id,
      label,
      ok: false,
      details: `missing "## Golden Commands" section in ${relativePath}`,
    };
  }

  const commands = findGoldenCommands(section);
  if (commands.length === 0) {
    return {
      id,
      label,
      ok: false,
      details: `no golden commands listed in ${relativePath}`,
    };
  }

  return { id, label, ok: true };
}

async function checkFilePresent(
  rootDir: string,
  relPath: string,
  id: string,
  label: string,
): Promise<ReadinessCheckResult> {
  const exists = await fileExists(path.join(rootDir, relPath));
  return {
    id,
    label,
    ok: exists,
    details: exists ? undefined : `missing ${relPath}`,
  };
}

const CHECKS: ReadinessCheck[] = [
  {
    id: 'readme-docs',
    label: 'README docs section with links',
    run: checkReadmeDocsSection,
  },
  {
    id: 'docs-golden-commands',
    label: 'Docs golden commands configured',
    run: checkDocsGoldenCommands,
  },
  {
    id: 'docs-quickstart',
    label: 'docs/quickstart-v0.1.md present',
    run: (rootDir) =>
      checkFilePresent(
        rootDir,
        'docs/quickstart-v0.1.md',
        'docs-quickstart',
        'docs/quickstart-v0.1.md present',
      ),
  },
  {
    id: 'docs-functional-spec',
    label: 'docs/functional-spec-v0.1.md present',
    run: (rootDir) =>
      checkFilePresent(
        rootDir,
        'docs/functional-spec-v0.1.md',
        'docs-functional-spec',
        'docs/functional-spec-v0.1.md present',
      ),
  },
  {
    id: 'docs-prd',
    label: 'docs/prd-v0.1.md present',
    run: (rootDir) =>
      checkFilePresent(rootDir, 'docs/prd-v0.1.md', 'docs-prd', 'docs/prd-v0.1.md present'),
  },
];

export async function runReadinessChecks(rootDir: string): Promise<ReadinessReport> {
  const results: ReadinessCheckResult[] = [];

  for (const check of CHECKS) {
    results.push(await check.run(rootDir));
  }

  const total = results.length;
  const passed = results.filter((result) => result.ok).length;
  const failed = total - passed;

  return {
    ok: failed === 0,
    total,
    passed,
    failed,
    results,
  };
}

export function formatReadinessReport(report: ReadinessReport): string {
  const status = report.ok ? 'PASS' : 'FAIL';
  const lines = [`Readiness report: ${status} (${report.passed}/${report.total})`];

  for (const result of report.results) {
    const detail = result.details ? ` - ${result.details}` : '';
    lines.push(`${result.ok ? 'PASS' : 'FAIL'} ${result.label}${detail}`);
  }

  return lines.join('\n');
}
