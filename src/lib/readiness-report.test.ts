import { describe, expect, it } from 'vitest';
import os from 'node:os';
import path from 'node:path';
import fs from 'node:fs/promises';

import { formatReadinessReport, runReadinessChecks } from './readiness-report.js';

const writeFile = async (rootDir: string, relPath: string, contents: string) => {
  const fullPath = path.join(rootDir, relPath);
  await fs.mkdir(path.dirname(fullPath), { recursive: true });
  await fs.writeFile(fullPath, contents, 'utf8');
};

describe('runReadinessChecks', () => {
  it('passes when key docs exist and are configured', async () => {
    const rootDir = await fs.mkdtemp(path.join(os.tmpdir(), 'hanuman-readiness-'));

    await writeFile(rootDir, 'README.md', '# Title\n\n## Docs\n- [Docs](docs/README.md)\n');
    await writeFile(
      rootDir,
      'docs/README.md',
      ['# Docs', '', '## Golden Commands', '```bash', 'node dist/cli.js --help', '```', ''].join('\n'),
    );
    await writeFile(rootDir, 'docs/quickstart-v0.1.md', 'Quickstart');
    await writeFile(rootDir, 'docs/functional-spec-v0.1.md', 'Spec');
    await writeFile(rootDir, 'docs/prd-v0.1.md', 'PRD');

    const report = await runReadinessChecks(rootDir);
    expect(report.ok).toBe(true);
    expect(report.passed).toBe(report.total);

    const output = formatReadinessReport(report);
    expect(output.split('\n')[0]).toBe(`Readiness report: PASS (${report.total}/${report.total})`);
  });

  it('fails when README is missing docs links', async () => {
    const rootDir = await fs.mkdtemp(path.join(os.tmpdir(), 'hanuman-readiness-'));

    await writeFile(rootDir, 'README.md', '# Title\n');
    await writeFile(
      rootDir,
      'docs/README.md',
      ['# Docs', '', '## Golden Commands', '```bash', 'node dist/cli.js --help', '```', ''].join('\n'),
    );
    await writeFile(rootDir, 'docs/quickstart-v0.1.md', 'Quickstart');
    await writeFile(rootDir, 'docs/functional-spec-v0.1.md', 'Spec');
    await writeFile(rootDir, 'docs/prd-v0.1.md', 'PRD');

    const report = await runReadinessChecks(rootDir);
    expect(report.ok).toBe(false);

    const readmeCheck = report.results.find((result) => result.id === 'readme-docs');
    expect(readmeCheck?.ok).toBe(false);
  });
});
