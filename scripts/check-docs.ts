#!/usr/bin/env node
import { promises as fs } from 'node:fs';
import path from 'node:path';
import process from 'node:process';

import { extractDocsSection, findRelativeLinks } from '../src/lib/docs-readiness.js';

const rootDir = process.cwd();
const readmePath = path.join(rootDir, 'README.md');

const readme = await fs.readFile(readmePath, 'utf8');
const docsSection = extractDocsSection(readme);

if (!docsSection) {
  console.error('README.md is missing the "## Docs" section.');
  process.exitCode = 1;
} else {
  const links = findRelativeLinks(docsSection);
  if (links.length === 0) {
    console.error('README.md "## Docs" section has no relative links.');
    process.exitCode = 1;
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
      process.exitCode = 1;
    } else {
      console.log('Docs link check passed.');
    }
  }
}
