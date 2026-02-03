import { promises as fs } from 'node:fs';
import path from 'node:path';

const TODO_TOKEN = 'TO' + 'DO';
const FIXME_TOKEN = 'FIX' + 'ME';
const TOKEN_PATTERN = `${TODO_TOKEN}|${FIXME_TOKEN}`;

export type TodoToken = typeof TODO_TOKEN | typeof FIXME_TOKEN;

export type TodoViolation = {
  filePath: string;
  line: number;
  column: number;
  token: TodoToken;
  lineText: string;
  reason: string;
};

const TOKEN_RE = new RegExp(`\\b(${TOKEN_PATTERN})\\b`, 'g');
const VALID_RE = new RegExp(`^(${TOKEN_PATTERN})\\([^\\s)]+\\):\\s+\\S`);

export const DEFAULT_IGNORE_DIRS = new Set([
  '.git',
  '.pnpm-store',
  'dist',
  'node_modules',
]);

export const DEFAULT_IGNORE_FILES = new Set([
  'pnpm-lock.yaml',
]);

export type ScanOptions = {
  ignoreDirs?: Set<string>;
  ignoreFiles?: Set<string>;
};

export function findTodoViolations(text: string, filePath: string): TodoViolation[] {
  const violations: TodoViolation[] = [];
  const lines = text.split(/\r?\n/);

  for (let index = 0; index < lines.length; index += 1) {
    const line = lines[index];
    TOKEN_RE.lastIndex = 0;

    let match: RegExpExecArray | null = TOKEN_RE.exec(line);
    while (match) {
      const token = match[1] as TodoToken;
      const rest = line.slice(match.index);

      if (!VALID_RE.test(rest)) {
        violations.push({
          filePath,
          line: index + 1,
          column: match.index + 1,
          token,
          lineText: line,
          reason: 'Use TODO(tag): message or FIXME(tag): message.',
        });
      }

      match = TOKEN_RE.exec(line);
    }
  }

  return violations;
}

async function walkDir(
  dir: string,
  options: Required<ScanOptions>,
): Promise<string[]> {
  const entries = await fs.readdir(dir, { withFileTypes: true });
  const files: string[] = [];

  for (const entry of entries) {
    if (entry.isDirectory()) {
      if (options.ignoreDirs.has(entry.name)) {
        continue;
      }

      const nested = await walkDir(path.join(dir, entry.name), options);
      files.push(...nested);
      continue;
    }

    if (!entry.isFile()) {
      continue;
    }

    if (options.ignoreFiles.has(entry.name)) {
      continue;
    }

    files.push(path.join(dir, entry.name));
  }

  return files;
}

function isProbablyText(contents: string): boolean {
  return !contents.includes('\u0000');
}

export async function scanTodoViolations(
  rootDir: string,
  options: ScanOptions = {},
): Promise<TodoViolation[]> {
  const ignoreDirs = options.ignoreDirs ?? DEFAULT_IGNORE_DIRS;
  const ignoreFiles = options.ignoreFiles ?? DEFAULT_IGNORE_FILES;
  const files = await walkDir(rootDir, { ignoreDirs, ignoreFiles });
  const violations: TodoViolation[] = [];

  for (const filePath of files) {
    let contents: string;

    try {
      contents = await fs.readFile(filePath, 'utf8');
    } catch {
      continue;
    }

    if (!isProbablyText(contents)) {
      continue;
    }

    const relativePath = path.relative(rootDir, filePath);
    violations.push(...findTodoViolations(contents, relativePath));
  }

  return violations;
}

export function formatTodoViolations(violations: TodoViolation[]): string {
  if (violations.length === 0) {
    return '';
  }

  const lines = ['Todo/Fixme convention violations found:'];

  for (const violation of violations) {
    lines.push(
      `- ${violation.filePath}:${violation.line}:${violation.column} ${violation.token} must use TODO(tag): message`,
      `  ${violation.lineText.trim()}`,
    );
  }

  return lines.join('\n');
}
