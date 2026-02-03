#!/usr/bin/env node
import process from 'node:process';

import {
  formatTodoViolations,
  scanTodoViolations,
} from '../src/lib/todo-convention.js';

const rootDir = process.cwd();
const violations = await scanTodoViolations(rootDir);

if (violations.length > 0) {
  console.error(formatTodoViolations(violations));
  process.exitCode = 1;
} else {
  console.log('Todo/Fixme convention check passed.');
}
