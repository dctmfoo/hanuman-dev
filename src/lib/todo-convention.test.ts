import { describe, expect, it } from 'vitest';

import { findTodoViolations } from './todo-convention.js';

describe('findTodoViolations', () => {
  it('accepts properly formatted todo/fixme comments', () => {
    const todo = 'TO' + 'DO';
    const fixme = 'FIX' + 'ME';
    const text = [
      `// ${todo}(AR8-123): add check`,
      `/* ${fixme}(ops-42): handle missing config */`,
    ].join('\n');

    expect(findTodoViolations(text, 'src/sample.ts')).toEqual([]);
  });

  it('flags missing tag or message text', () => {
    const todo = 'TO' + 'DO';
    const fixme = 'FIX' + 'ME';
    const text = [
      `// ${todo}: missing tag`,
      `// ${fixme}(ops-42):`,
      `// ${todo}(): empty tag`,
    ].join('\n');

    const violations = findTodoViolations(text, 'src/sample.ts');

    expect(violations).toHaveLength(3);
    expect(violations.map((violation) => violation.line)).toEqual([1, 2, 3]);
  });

  it('flags mixed valid and invalid tokens on the same line', () => {
    const todo = 'TO' + 'DO';
    const text = `// ${todo}(AR8-123): ok ${todo}`;
    const violations = findTodoViolations(text, 'src/sample.ts');

    expect(violations).toHaveLength(1);
    expect(violations[0].column).toBe(22);
  });
});
