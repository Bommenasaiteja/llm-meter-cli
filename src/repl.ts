import * as readline from 'readline';
import chalk from 'chalk';
import { statsCommand } from './commands/stats';
import { requestsCommand, requestCommand } from './commands/requests';
import { serveCommand } from './commands/serve';
import { pricingCommand } from './commands/pricing';

interface CommandMatch {
  command: string;
  options: any;
  args?: string[];
}

export class LLMMeterREPL {
  private rl: readline.Interface;
  private running: boolean = false;

  constructor() {
    this.rl = readline.createInterface({
      input: process.stdin,
      output: process.stdout,
      prompt: chalk.cyan('llm-meter> '),
      completer: this.completer.bind(this),
      terminal: true,
    });

    // Handle Ctrl+C gracefully
    this.rl.on('SIGINT', () => {
      console.log('');
      this.rl.question(chalk.yellow('Exit? (y/n) '), (answer) => {
        if (answer.toLowerCase() === 'y' || answer.toLowerCase() === 'yes') {
          this.running = false;
          this.rl.close();
        } else {
          console.log('');
          this.rl.prompt();
        }
      });
    });
  }

  start() {
    this.running = true;
    // Set environment variable to indicate REPL mode
    process.env.LLM_METER_REPL = 'true';

    // Ensure stdin is in the correct mode
    if (process.stdin.isTTY) {
      process.stdin.setRawMode(false);
    }

    this.printWelcome();
    this.rl.prompt();

    this.rl.on('line', async (line: string) => {
      const input = line.trim();

      if (!input) {
        this.rl.prompt();
        return;
      }

      // Pause readline during command execution
      this.rl.pause();

      try {
        await this.handleInput(input);
      } catch (error: any) {
        // Only show error if it's not already handled by command functions
        if (!error.message?.includes('Failed to fetch')) {
          console.error(chalk.red('Error:'), error.message);
        }
      }

      // Resume and show prompt again
      if (this.running) {
        this.rl.resume();
        console.log(''); // Add newline for spacing
        this.rl.prompt();
      }
    });

    this.rl.on('close', () => {
      console.log(chalk.yellow('\nGoodbye! 👋'));
      process.exit(0);
    });
  }

  private printWelcome() {
    console.log('');
    console.log(chalk.cyan('  ╦   ╦   ╔╦╗  ') + chalk.magenta('  ╔╦╗  ╔═╗  ╔╦╗  ╔═╗  ╦═╗'));
    console.log(chalk.cyan('  ║   ║   ║║║  ') + chalk.magenta('  ║║║  ║╣    ║   ║╣   ╠╦╝'));
    console.log(chalk.cyan('  ╩═╝ ╩═╝ ╩ ╩  ') + chalk.magenta('  ╩ ╩  ╚═╝   ╩   ╚═╝  ╩╚═'));
    console.log('');
    console.log(chalk.gray('  Track and monitor your LLM usage interactively\n'));
    console.log(chalk.gray('  Type') + ' ' + chalk.cyan('help') + ' ' + chalk.gray('to see all available commands'));
    console.log(chalk.gray('  Type') + ' ' + chalk.cyan('exit') + ' ' + chalk.gray('or press') + ' ' + chalk.cyan('Ctrl+C') + ' ' + chalk.gray('to quit\n'));
  }

  private async handleInput(input: string) {
    // Remove leading slash if present (support both /stats and stats)
    const command = input.startsWith('/') ? input.slice(1) : input;

    // Handle special commands
    if (command === 'exit' || command === 'quit') {
      this.running = false;
      this.rl.close();
      return;
    }

    if (command === 'help' || command === '?') {
      this.showHelp();
      return;
    }

    if (command === 'clear' || command === 'cls') {
      console.clear();
      this.printWelcome();
      return;
    }

    // Parse and execute command
    const match = this.parseCommand(command);
    if (match) {
      await this.executeCommand(match);
    } else {
      console.log(chalk.yellow(`Command not recognized: "${command}"`));
      console.log(chalk.gray('Type') + ' ' + chalk.cyan('help') + ' ' + chalk.gray('for available commands'));
    }
  }

  private parseCommand(input: string): CommandMatch | null {
    const lower = input.toLowerCase();

    // Stats command patterns
    if (
      lower.match(/^(show|view|get|display)?\s*(usage\s*)?(stats|statistics)/) ||
      lower === 'stats'
    ) {
      const options: any = {};

      // Extract project filter
      const projectMatch = input.match(/(?:for|project)\s+([^\s]+)/i);
      if (projectMatch) {
        options.project = projectMatch[1];
      }

      return { command: 'stats', options };
    }

    // Requests list command patterns
    if (
      lower.match(/^(show|view|list|get|display)\s*(all\s*)?(requests|calls|logs)/) ||
      lower === 'requests' ||
      lower === 'logs'
    ) {
      const options: any = {};

      // Extract filters
      const pageMatch = input.match(/page\s+(\d+)/i);
      if (pageMatch) {
        options.page = pageMatch[1];
      }

      const limitMatch = input.match(/(?:limit|show|top)\s+(\d+)/i);
      if (limitMatch) {
        options.limit = limitMatch[1];
      }

      const projectMatch = input.match(/(?:project|for)\s+([^\s]+)/i);
      if (projectMatch) {
        options.project = projectMatch[1];
      }

      const providerMatch = input.match(/(?:provider|from)\s+(openai|anthropic|ollama|gemini)/i);
      if (providerMatch) {
        options.provider = providerMatch[1].toLowerCase();
      }

      const modelMatch = input.match(/(?:model|using)\s+([^\s]+)/i);
      if (modelMatch) {
        options.model = modelMatch[1];
      }

      return { command: 'requests', options };
    }

    // Request details command patterns
    if (
      lower.match(/^(show|view|get|display)\s*(request|details|info)/) ||
      lower.match(/^request\s+/)
    ) {
      const idMatch = input.match(/(?:request|id|details?)\s+([a-zA-Z0-9-]+)/i);
      if (idMatch) {
        return { command: 'request', options: {}, args: [idMatch[1]] };
      }
      console.log(chalk.yellow('Please specify a request ID'));
      console.log(chalk.gray('Example:') + ' ' + chalk.cyan('show request abc123'));
      return null;
    }

    // Serve command patterns
    if (
      lower.match(/^(start|run|serve|launch)\s*(server|backend)?/) ||
      lower === 'serve'
    ) {
      const options: any = {};

      const portMatch = input.match(/(?:port|on)\s+(\d+)/i);
      if (portMatch) {
        options.port = portMatch[1];
      }

      const dashboardMatch = input.match(/dashboard\s*(?:port)?\s+(\d+)/i);
      if (dashboardMatch) {
        options.dashboardPort = dashboardMatch[1];
      }

      return { command: 'serve', options };
    }

    // Enhanced pricing commands patterns with better parameter parsing
    if (
      lower.match(/^(show|view|list|get|display)?\s*(model\s*)?(pricing|cost|price)/) ||
      lower === 'pricing' ||
      lower === 'price'
    ) {
      const options: any = {};

      // Check if it's an edit action
      const editMatch = input.match(/edit|update|modify/i);
      if (editMatch) {
        options.action = 'edit';
      }

      // Parse parameters like --model, --provider, --inputPrice, --outputPrice
      const modelParamMatch = input.match(/--model\s+([^\s]+)/i);
      if (modelParamMatch) {
        options.model = modelParamMatch[1];
      } else {
        // Also support "for" syntax as fallback
        const modelMatch = input.match(/(?:model|for)\s+([^\s]+)/i);
        if (modelMatch) {
          options.model = modelMatch[1];
        }
      }

      const providerParamMatch = input.match(/--provider\s+(openai|anthropic|ollama|gemini)/i);
      if (providerParamMatch) {
        options.provider = providerParamMatch[1].toLowerCase();
      } else {
        // Also support "from" syntax as fallback
        const providerMatch = input.match(/(?:provider|from)\s+(openai|anthropic|ollama|gemini)/i);
        if (providerMatch) {
          options.provider = providerMatch[1].toLowerCase();
        }
      }

      const inputPriceMatch = input.match(/--inputPrice\s+([^\s]+)/i);
      if (inputPriceMatch) {
        options.inputPrice = inputPriceMatch[1];
      }

      const outputPriceMatch = input.match(/--outputPrice\s+([^\s]+)/i);
      if (outputPriceMatch) {
        options.outputPrice = outputPriceMatch[1];
      }

      return { command: 'pricing', options };
    }

    return null;
  }

  private async executeCommand(match: CommandMatch) {
    try {
      switch (match.command) {
        case 'stats':
          await statsCommand(match.options);
          break;

        case 'requests':
          await requestsCommand(match.options);
          break;

        case 'request':
          if (match.args && match.args[0]) {
            await requestCommand(match.args[0]);
          }
          break;

        case 'serve':
          serveCommand(match.options);
          break;

        case 'pricing':
          await pricingCommand(match.options);
          break;

        default:
          console.log(chalk.red('Unknown command'));
      }
    } catch (error: any) {
      // Error already handled by command functions
      // Just prevent REPL from crashing
      if (error.message && !error.message.includes('Failed to fetch')) {
        console.error(chalk.red('Command error:'), error.message);
      }
    }
  }

  private showHelp() {
    console.log(chalk.bold('\nAvailable Commands\n'));

    const commands = [
      {
        category: 'Statistics',
        commands: [
          { pattern: 'stats', description: 'Show overall usage statistics' },
          { pattern: 'stats for <project>', description: 'Show stats for a specific project' },
        ],
      },
      {
        category: 'Requests',
        commands: [
          { pattern: 'requests', description: 'List recent API requests' },
          { pattern: 'requests page 2', description: 'Show page 2 of requests' },
          { pattern: 'requests limit 50', description: 'Show 50 requests per page' },
          { pattern: 'requests for <project>', description: 'Filter by project name' },
          { pattern: 'requests from openai', description: 'Filter by provider (openai, anthropic, etc.)' },
          { pattern: 'request <id>', description: 'View details of a specific request' },
        ],
      },
      {
        category: 'Server',
        commands: [
          { pattern: 'serve', description: 'Show instructions to start the server' },
        ],
      },
      {
        category: 'Pricing',
        commands: [
          { pattern: 'pricing', description: 'Show model pricing information' },
          { pattern: 'pricing for gpt-4', description: 'Show pricing for specific model' },
          { pattern: 'pricing for openai', description: 'Show pricing for specific provider' },
          { pattern: 'pricing edit', description: 'Edit pricing information' },
        ],
      },
      {
        category: 'System',
        commands: [
          { pattern: 'help', description: 'Show this help message' },
          { pattern: 'clear', description: 'Clear the screen' },
          { pattern: 'exit', description: 'Exit the CLI' },
        ],
      },
    ];

    commands.forEach((section) => {
      console.log(chalk.bold.cyan(section.category + ':'));
      section.commands.forEach((cmd) => {
        console.log(
          '  ' + chalk.cyan(cmd.pattern.padEnd(32)) + chalk.gray(cmd.description)
        );
      });
      console.log('');
    });

    console.log(chalk.bold('Tips:'));
    console.log(chalk.gray('  - Use Tab for command completion'));
    console.log(chalk.gray('  - Use ↑/↓ arrow keys to navigate command history'));
    console.log('');
  }

  private completer(line: string): [string[], string] {
    const completions = [
      'stats',
      'stats for ',
      'requests',
      'requests page ',
      'requests limit ',
      'requests for ',
      'requests from openai',
      'requests from anthropic',
      'requests from ollama',
      'request ',
      'pricing',
      'pricing for ',
      'pricing edit',
      'serve',
      'help',
      'clear',
      'exit',
    ];

    const hits = completions.filter((c) => c.startsWith(line));
    return [hits.length ? hits : completions, line];
  }
}
