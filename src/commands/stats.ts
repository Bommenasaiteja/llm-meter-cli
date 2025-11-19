import axios from 'axios';
import chalk from 'chalk';
import ora from 'ora';
import Table from 'cli-table3';

const API_URL = process.env.LLM_METER_API || 'http://localhost:3001/api';

export async function statsCommand(options: { project?: string; days?: string }) {
  const spinner = ora('Fetching statistics...').start();

  try {
    const { data } = await axios.get(`${API_URL}/analytics/stats`, {
      params: {
        project: options.project,
      },
    });

    spinner.succeed('Statistics fetched successfully');

    console.log('\n' + chalk.bold.blue('LLM Meter - Usage Statistics') + '\n');

    // Summary table
    const summaryTable = new Table({
      head: [chalk.cyan('Metric'), chalk.cyan('Value')],
    });

    summaryTable.push(
      ['Total Cost', chalk.green(`$${data.totalCost.toFixed(4)}`)],
      ['Total Tokens', chalk.yellow(data.totalTokens.toLocaleString())],
      ['Total Requests', chalk.magenta(data.totalRequests.toLocaleString())],
      [
        'Avg Cost/Request',
        chalk.green(
          `$${(data.totalCost / Math.max(data.totalRequests, 1)).toFixed(6)}`
        ),
      ]
    );

    console.log(summaryTable.toString());

    // Model breakdown
    if (data.byModel && data.byModel.length > 0) {
      console.log('\n' + chalk.bold('By Model:') + '\n');

      const modelTable = new Table({
        head: [
          chalk.cyan('Provider'),
          chalk.cyan('Model'),
          chalk.cyan('Requests'),
          chalk.cyan('Tokens'),
          chalk.cyan('Cost'),
          chalk.cyan('Avg Latency'),
        ],
      });

      data.byModel.forEach((model: any) => {
        modelTable.push([
          model.provider,
          model.model,
          model.requestCount.toLocaleString(),
          model.totalTokens.toLocaleString(),
          chalk.green(`$${model.totalCost.toFixed(4)}`),
          `${model.avgLatencyMs.toFixed(0)}ms`,
        ]);
      });

      console.log(modelTable.toString());
    }

    // Project breakdown
    if (data.byProject && data.byProject.length > 0 && !options.project) {
      console.log('\n' + chalk.bold('By Project:') + '\n');

      const projectTable = new Table({
        head: [
          chalk.cyan('Project'),
          chalk.cyan('Requests'),
          chalk.cyan('Tokens'),
          chalk.cyan('Cost'),
          chalk.cyan('Models'),
        ],
      });

      data.byProject.forEach((project: any) => {
        projectTable.push([
          project.project,
          project.requestCount.toLocaleString(),
          project.totalTokens.toLocaleString(),
          chalk.green(`$${project.totalCost.toFixed(4)}`),
          project.models.join(', '),
        ]);
      });

      console.log(projectTable.toString());
    }

    // Function breakdown
    try {
      const functionsData = await axios.get(`${API_URL}/analytics/functions`, {
        params: {
          project: options.project,
        },
      });

      if (functionsData.data && functionsData.data.length > 0) {
        console.log('\n' + chalk.bold('By Function:') + '\n');

        const functionTable = new Table({
          head: [
            chalk.cyan('Function'),
            chalk.cyan('Requests'),
            chalk.cyan('Input'),
            chalk.cyan('Output'),
            chalk.cyan('Total'),
            chalk.cyan('Cost'),
            chalk.cyan('Avg Latency'),
          ],
        });

        functionsData.data.forEach((func: any) => {
          functionTable.push([
            chalk.cyan(func.functionName),
            func.requestCount.toLocaleString(),
            func.inputTokens.toLocaleString(),
            func.outputTokens.toLocaleString(),
            func.totalTokens.toLocaleString(),
            chalk.green(`$${func.totalCost.toFixed(4)}`),
            `${func.avgLatencyMs.toFixed(0)}ms`,
          ]);
        });

        console.log(functionTable.toString());
      }
    } catch (funcError) {
      // Silently ignore if functions endpoint doesn't exist yet
    }

    // Only add newline if not in REPL mode
    if (process.env.LLM_METER_REPL !== 'true') {
      console.log('');
    }
  } catch (error: any) {
    spinner.fail('Failed to fetch statistics');
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
