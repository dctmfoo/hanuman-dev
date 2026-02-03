import { describe, expect, it } from 'vitest';

import {
  extractDocsSection,
  extractGoldenCommandsSection,
  findGoldenCommands,
  findRelativeLinks,
} from './docs-readiness.js';

describe('extractDocsSection', () => {
  it('returns null when no docs section exists', () => {
    const readme = ['# Title', '## Setup', '- step'].join('\n');
    expect(extractDocsSection(readme)).toBeNull();
  });

  it('captures the docs section content', () => {
    const readme = [
      '# Title',
      '',
      '## Docs',
      '- [Spec](docs/spec.md)',
      '- [Guide](docs/guide.md)',
      '',
      '## Next',
      'More text',
    ].join('\n');

    const section = extractDocsSection(readme);
    expect(section).toContain('[Spec](docs/spec.md)');
    expect(section).toContain('[Guide](docs/guide.md)');
    expect(section).not.toContain('## Next');
  });
});

describe('findRelativeLinks', () => {
  it('returns only relative links and strips anchors', () => {
    const markdown = [
      '- [Spec](docs/spec.md)',
      '- [Anchor](docs/guide.md#top)',
      '- [External](https://example.com)',
      '- [Local](#local)',
    ].join('\n');

    expect(findRelativeLinks(markdown)).toEqual(['docs/spec.md', 'docs/guide.md']);
  });
});

describe('extractGoldenCommandsSection', () => {
  it('captures the golden commands section content', () => {
    const readme = [
      '# Docs',
      '',
      '## Golden Commands',
      '```bash',
      'pnpm -s build',
      '```',
      '',
      '## Next',
      'More text',
    ].join('\n');

    const section = extractGoldenCommandsSection(readme);
    expect(section).toContain('pnpm -s build');
    expect(section).not.toContain('## Next');
  });
});

describe('findGoldenCommands', () => {
  it('extracts commands from shell fences and normalizes prompts', () => {
    const section = [
      '```bash',
      '# comment',
      '$ pnpm -s build',
      'node dist/cli.js --help \\',
      '  --json',
      '```',
      '```ts',
      'console.log(\"skip\");',
      '```',
    ].join('\n');

    expect(findGoldenCommands(section)).toEqual([
      'pnpm -s build',
      'node dist/cli.js --help --json',
    ]);
  });
});
