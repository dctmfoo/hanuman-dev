#!/usr/bin/env node
import { spawn, spawnSync } from 'node:child_process';
import { promises as fs } from 'node:fs';
import path from 'node:path';
import process from 'node:process';

import {
  extractDocsSection,
  extractGoldenCommandsSection,
  findGoldenCommands,
  findRelativeLinks,
} from '../src/lib/docs-readiness.js';

const rootDir = process.cwd();
const readmePath = path.join(rootDir, 'README.md');
const docsReadmeCandidates = [
  path.join(rootDir, 'docs', 'README.md'),
  path.join(rootDir, 'docs', 'README'),
];

let hasErrors = false;

const recordError = (message: string) => {
  console.error(message);
  hasErrors = true;
};

const readFirstExisting = async (paths: string[]) => {
  for (const candidate of paths) {
    try {
      const content = await fs.readFile(candidate, 'utf8');
      return { path: candidate, content };
    } catch {
      // keep trying next candidate
    }
  }
  return null;
};

const runCommand = async (command: string) =>
  new Promise<number>((resolve) => {
    const child = spawn(command, {
      cwd: rootDir,
      shell: true,
      stdio: 'inherit',
    });

    child.on('error', () => resolve(1));
    child.on('exit', (code) => resolve(code ?? 1));
  });

const getDocsDrift = () => {
  const result = spawnSync('git', ['status', '--porcelain', '--untracked-files=normal', 'docs'], {
    cwd: rootDir,
    encoding: 'utf8',
  });

  if (result.status !== 0) {
    recordError('Failed to read git status for docs drift check.');
    return [] as string[];
  }

  return result.stdout.split(/\r?\n/).filter(Boolean);
};

const readme = await fs.readFile(readmePath, 'utf8');
const docsSection = extractDocsSection(readme);

if (!docsSection) {
  recordError('README.md is missing the "## Docs" section.');
} else {
  const links = findRelativeLinks(docsSection);
  if (links.length === 0) {
    recordError('README.md "## Docs" section has no relative links.');
  } else {
    const missing: string[] = [];
    for (const link of links) {
      const targetPath = path.resolve(rootDir, link);
      try {
        await fs.stat(targetPath);
      } catch {
        missing.push(link);
      }
    }

    if (missing.length > 0) {
      console.error('Docs links missing from disk:');
      for (const link of missing) {
        console.error(`- ${link}`);
      }
      hasErrors = true;
    } else {
      console.log('Docs link check passed.');
    }
  }
}

const docsReadme = await readFirstExisting(docsReadmeCandidates);

if (!docsReadme) {
  recordError('docs/README.md is missing.');
} else {
  const goldenSection = extractGoldenCommandsSection(docsReadme.content);
  if (!goldenSection) {
    recordError(`${path.relative(rootDir, docsReadme.path)} is missing the "## Golden Commands" section.`);
  } else {
    const commands = findGoldenCommands(goldenSection);
    if (commands.length === 0) {
      recordError(`${path.relative(rootDir, docsReadme.path)} has no golden commands listed.`);
    } else {
      let goldenFailed = false;
      for (const command of commands) {
        console.log(`Running: ${command}`);
        const exitCode = await runCommand(command);
        if (exitCode !== 0) {
          recordError(`Golden command failed (${exitCode}): ${command}`);
          goldenFailed = true;
        }
      }

      if (!goldenFailed) {
        const drift = getDocsDrift();
        if (drift.length > 0) {
          console.error('Docs drift detected after running golden commands:');
          for (const line of drift) console.error(line);
          hasErrors = true;
        } else {
          console.log('Docs golden command check passed.');
        }
      }
    }
  }
}

if (hasErrors) {
  process.exitCode = 1;
}
