#!/usr/bin/env node
import process from 'node:process';

import { formatReadinessReport, runReadinessChecks } from '../src/lib/readiness-report.js';

const report = await runReadinessChecks(process.cwd());
console.log(formatReadinessReport(report));

if (!report.ok) {
  process.exitCode = 1;
}
