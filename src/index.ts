#!/usr/bin/env node

import { Command } from 'commander';
import chalk from 'chalk';
import { statsCommand } from './commands/stats';
import { serveCommand } from './commands/serve';
import { requestsCommand, requestCommand } from './commands/requests';
import { pricingCommand } from './commands/pricing';
import { LLMMeterREPL } from './repl';

const program = new Command();

program
  .name('llm-meter')
  .description('CLI tool for LLM Meter - Track and monitor LLM usage')
  .version('0.1.0');

program
  .command('stats')
  .description('Show usage statistics')
  .option('-p, --project <name>', 'Filter by project')
  .option('-d, --days <number>', 'Number of days to show', '7')
  .action(statsCommand);

program
  .command('requests')
  .description('List individual API requests with token details')
  .option('--page <number>', 'Page number', '1')
  .option('--limit <number>', 'Requests per page', '20')
  .option('-p, --project <name>', 'Filter by project name')
  .option('--provider <name>', 'Filter by provider (openai, anthropic, etc.)')
  .option('--model <name>', 'Filter by model name')
  .action(requestsCommand);

program
  .command('request <id>')
  .description('Show detailed information about a specific request')
  .action(requestCommand);

program
  .command('serve')
  .description('Start the LLM Meter server')
  .option('-p, --port <number>', 'Port to run backend on', '3001')
  .option('--dashboard-port <number>', 'Port to run dashboard on', '3000')
  .action(serveCommand);

program
  .command('pricing')
  .description('View and edit model pricing')
  .option('-a, --action <action>', 'Action to perform (view, edit)', 'view')
  .option('--model <model>', 'Filter by model name or specify model to edit')
  .option('--provider <provider>', 'Filter by provider or specify provider for edit')
  .option('--inputPrice <price>', 'Input cost per 1k tokens for editing')
  .option('--outputPrice <price>', 'Output cost per 1k tokens for editing')
  .action(pricingCommand);

// If no arguments provided, start interactive mode
if (process.argv.length === 2) {
  const repl = new LLMMeterREPL();
  repl.start();
} else {
  program.parse();
}
