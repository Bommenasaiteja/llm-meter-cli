import axios from 'axios';
import chalk from 'chalk';
import ora from 'ora';
import Table from 'cli-table3';
import { formatDistanceToNow } from 'date-fns';

const API_URL = process.env.LLM_METER_API || 'http://localhost:3001/api';

interface RequestsOptions {
  page?: string;
  limit?: string;
  project?: string;
  provider?: string;
  model?: string;
}

export async function requestsCommand(options: RequestsOptions) {
  const spinner = ora('Fetching requests...').start();

  try {
    const { data } = await axios.get(`${API_URL}/analytics/requests`, {
      params: {
        page: options.page || 1,
        limit: options.limit || 20,
        project: options.project,
        provider: options.provider,
        model: options.model,
      },
    });

    spinner.succeed('Requests fetched successfully');

    console.log('\n' + chalk.bold.blue('LLM Meter - Request Logs') + '\n');

    if (data.requests.length === 0) {
      console.log(chalk.yellow('No requests found.'));
      console.log(chalk.gray('Make some API calls to see them here.\n'));
      return;
    }

    // Summary
    console.log(
      chalk.gray(
        `Showing ${data.requests.length} of ${data.pagination.total} requests (Page ${data.pagination.page}/${data.pagination.totalPages})`
      ) + '\n'
    );

    // Requests table
    const table = new Table({
      head: [
        chalk.cyan('ID'),
        chalk.cyan('Time'),
        chalk.cyan('Function'),
        chalk.cyan('Project'),
        chalk.cyan('Provider'),
        chalk.cyan('Model'),
        chalk.cyan('In'),
        chalk.cyan('Out'),
        chalk.cyan('Total'),
        chalk.cyan('Cost'),
      ],
      colWidths: [6, 16, 16, 14, 10, 16, 7, 7, 7, 10],
    });

    data.requests.forEach((req: any) => {
      const timeAgo = formatDistanceToNow(new Date(req.timestamp), {
        addSuffix: true,
      });

      table.push([
        chalk.gray(req.id),
        chalk.gray(timeAgo),
        chalk.cyan(req.functionName || '-'),
        req.project,
        getProviderColor(req.provider),
        chalk.gray(req.model),
        chalk.yellow(formatTokens(req.inputTokens)),
        chalk.green(formatTokens(req.outputTokens)),
        chalk.white(formatTokens(req.totalTokens)),
        chalk.green(`$${(req.cost || 0).toFixed(4)}`),
      ]);
    });

    console.log(table.toString());

    // Navigation hints
    console.log('');
    if (data.pagination.hasNext || data.pagination.hasPrev) {
      const hints = [];
      if (data.pagination.hasPrev) {
        hints.push(
          chalk.gray(`Previous: `) +
            chalk.cyan(`llm-meter requests --page ${data.pagination.page - 1}`)
        );
      }
      if (data.pagination.hasNext) {
        hints.push(
          chalk.gray(`Next: `) +
            chalk.cyan(`llm-meter requests --page ${data.pagination.page + 1}`)
        );
      }
      console.log(hints.join(' | ') + '\n');
    }

    // Tips
    console.log(chalk.gray('💡 Tips:'));
    console.log(
      chalk.gray('  • View details: ') +
        chalk.cyan('llm-meter request <id>')
    );
    console.log(
      chalk.gray('  • Filter by project: ') +
        chalk.cyan('llm-meter requests --project <name>')
    );
    console.log(
      chalk.gray('  • Filter by provider: ') +
        chalk.cyan('llm-meter requests --provider openai')
    );
    // Only add newline if not in REPL mode
    if (process.env.LLM_METER_REPL !== 'true') {
      console.log('');
    }
  } catch (error: any) {
    spinner.fail('Failed to fetch requests');
    console.error(chalk.red('\nError:'), error.message);
    console.log(
      chalk.yellow('\nMake sure the LLM Meter backend is running on'),
      chalk.cyan(API_URL)
    );
    // Don't exit if running in REPL mode
    if (process.env.LLM_METER_REPL !== 'true') {
      process.exit(1);
    }
  }
}

export async function requestCommand(id: string) {
  const spinner = ora(`Fetching request ${id}...`).start();

  try {
    const { data } = await axios.get(`${API_URL}/analytics/requests/${id}`);

    spinner.succeed('Request details fetched successfully');

    console.log('\n' + chalk.bold.blue('Request Details') + '\n');

    // Metadata
    const metaTable = new Table({
      head: [chalk.cyan('Property'), chalk.cyan('Value')],
    });

    metaTable.push(
      ['ID', chalk.white(data.id)],
      ['Timestamp', new Date(data.timestamp).toLocaleString()],
      ['Time Ago', formatDistanceToNow(new Date(data.timestamp), { addSuffix: true })],
      ['Project', chalk.white(data.project)],
      ['Function', chalk.cyan(data.functionName || 'Not specified')],
      ['Provider', getProviderColor(data.provider)],
      ['Model', chalk.white(data.model)],
      ['Latency', chalk.yellow(`${data.latencyMs}ms`)]
    );

    console.log(metaTable.toString());

    // Token & Cost breakdown
    console.log('\n' + chalk.bold('Token Usage & Cost:') + '\n');

    const tokenTable = new Table({
      head: [chalk.cyan('Metric'), chalk.cyan('Value')],
    });

    tokenTable.push(
      ['Input Tokens', chalk.yellow(data.inputTokens.toLocaleString())],
      ['Output Tokens', chalk.green(data.outputTokens.toLocaleString())],
      ['Total Tokens', chalk.white.bold(data.totalTokens.toLocaleString())],
      ['Cost', chalk.green.bold(`$${(data.cost || 0).toFixed(6)}`)]
    );

    console.log(tokenTable.toString());

    // Prompt preview
    if (data.promptPreview) {
      console.log('\n' + chalk.bold('Prompt Preview:') + '\n');
      console.log(chalk.gray('─'.repeat(60)));
      console.log(chalk.white(data.promptPreview));
      if (data.promptPreview.length >= 200) {
        console.log(chalk.gray('... (truncated)'));
      }
      console.log(chalk.gray('─'.repeat(60)));
    }

    // Response preview
    if (data.responsePreview) {
      console.log('\n' + chalk.bold('Response Preview:') + '\n');
      console.log(chalk.gray('─'.repeat(60)));
      console.log(chalk.white(data.responsePreview));
      if (data.responsePreview.length >= 200) {
        console.log(chalk.gray('... (truncated)'));
      }
      console.log(chalk.gray('─'.repeat(60)));
    }

    // Metadata
    if (data.metadata && Object.keys(data.metadata).length > 0) {
      console.log('\n' + chalk.bold('Metadata:') + '\n');
      console.log(chalk.gray(JSON.stringify(data.metadata, null, 2)));
    }

    // Only add newline if not in REPL mode
    if (process.env.LLM_METER_REPL !== 'true') {
      console.log('');
    }
  } catch (error: any) {
    spinner.fail('Failed to fetch request details');

    if (error.response?.status === 404) {
      console.error(chalk.red(`\nRequest with ID ${id} not found.`));
      console.log(chalk.yellow('Use'), chalk.cyan('llm-meter requests'), chalk.yellow('to see available requests.\n'));
    } else {
      console.error(chalk.red('\nError:'), error.message);
      console.log(
        chalk.yellow('\nMake sure the LLM Meter backend is running on'),
        chalk.cyan(API_URL)
      );
    }
    // Don't exit if running in REPL mode
    if (process.env.LLM_METER_REPL !== 'true') {
      process.exit(1);
    }
  }
}

function getProviderColor(provider: string): string {
  const colors: Record<string, any> = {
    openai: chalk.green,
    anthropic: chalk.magenta,
    ollama: chalk.blue,
    gemini: chalk.yellow,
  };
  const colorFn = colors[provider] || chalk.white;
  return colorFn(provider);
}

function formatTokens(tokens: number): string {
  if (tokens >= 1000) {
    return `${(tokens / 1000).toFixed(1)}k`;
  }
  return tokens.toString();
}
