import { describe, expect, it } from 'vitest';

import { extractDocsSection, findRelativeLinks } from './docs-readiness.js';

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
