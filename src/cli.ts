#!/usr/bin/env node

import { Command } from 'commander';

const program = new Command();

program
  .name('halo-workflow')
  .description('Repo-agnostic agentic workflow orchestrator (plan → work → review → compound).')
  .version('0.0.0');

program
  .command('init')
  .description('Initialize .halo/config.json in the current repo (stub).')
  .action(() => {
    console.log('init: TODO (will create .halo/config.json + helper scripts)');
  });

program
  .command('run')
  .argument('<brief...>', 'Brief description of the work')
  .description('Run the full workflow (stub).')
  .action((briefParts: string[]) => {
    const brief = briefParts.join(' ');
    console.log('run: TODO');
    console.log({ brief });
  });

program.parse();
