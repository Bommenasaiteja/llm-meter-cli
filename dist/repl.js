"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.LLMMeterREPL = void 0;
const readline = __importStar(require("readline"));
const chalk_1 = __importDefault(require("chalk"));
const stats_1 = require("./commands/stats");
const requests_1 = require("./commands/requests");
const serve_1 = require("./commands/serve");
const pricing_1 = require("./commands/pricing");
class LLMMeterREPL {
    constructor() {
        this.running = false;
        this.rl = readline.createInterface({
            input: process.stdin,
            output: process.stdout,
            prompt: chalk_1.default.cyan('llm-meter> '),
            completer: this.completer.bind(this),
            terminal: true,
        });
        // Handle Ctrl+C gracefully
        this.rl.on('SIGINT', () => {
            console.log('');
            this.rl.question(chalk_1.default.yellow('Exit? (y/n) '), (answer) => {
                if (answer.toLowerCase() === 'y' || answer.toLowerCase() === 'yes') {
                    this.running = false;
                    this.rl.close();
                }
                else {
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
        this.rl.on('line', async (line) => {
            const input = line.trim();
            if (!input) {
                this.rl.prompt();
                return;
            }
            // Pause readline during command execution
            this.rl.pause();
            try {
                await this.handleInput(input);
            }
            catch (error) {
                // Only show error if it's not already handled by command functions
                if (!error.message?.includes('Failed to fetch')) {
                    console.error(chalk_1.default.red('Error:'), error.message);
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
            console.log(chalk_1.default.yellow('\nGoodbye! 👋'));
            process.exit(0);
        });
    }
    printWelcome() {
        console.log('');
        console.log(chalk_1.default.cyan('  ╦   ╦   ╔╦╗  ') + chalk_1.default.magenta('  ╔╦╗  ╔═╗  ╔╦╗  ╔═╗  ╦═╗'));
        console.log(chalk_1.default.cyan('  ║   ║   ║║║  ') + chalk_1.default.magenta('  ║║║  ║╣    ║   ║╣   ╠╦╝'));
        console.log(chalk_1.default.cyan('  ╩═╝ ╩═╝ ╩ ╩  ') + chalk_1.default.magenta('  ╩ ╩  ╚═╝   ╩   ╚═╝  ╩╚═'));
        console.log('');
        console.log(chalk_1.default.gray('  Track and monitor your LLM usage interactively\n'));
        console.log(chalk_1.default.gray('  Type') + ' ' + chalk_1.default.cyan('help') + ' ' + chalk_1.default.gray('to see all available commands'));
        console.log(chalk_1.default.gray('  Type') + ' ' + chalk_1.default.cyan('exit') + ' ' + chalk_1.default.gray('or press') + ' ' + chalk_1.default.cyan('Ctrl+C') + ' ' + chalk_1.default.gray('to quit\n'));
    }
    async handleInput(input) {
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
        }
        else {
            console.log(chalk_1.default.yellow(`Command not recognized: "${command}"`));
            console.log(chalk_1.default.gray('Type') + ' ' + chalk_1.default.cyan('help') + ' ' + chalk_1.default.gray('for available commands'));
        }
    }
    parseCommand(input) {
        const lower = input.toLowerCase();
        // Stats command patterns
        if (lower.match(/^(show|view|get|display)?\s*(usage\s*)?(stats|statistics)/) ||
            lower === 'stats') {
            const options = {};
            // Extract project filter
            const projectMatch = input.match(/(?:for|project)\s+([^\s]+)/i);
            if (projectMatch) {
                options.project = projectMatch[1];
            }
            return { command: 'stats', options };
        }
        // Requests list command patterns
        if (lower.match(/^(show|view|list|get|display)\s*(all\s*)?(requests|calls|logs)/) ||
            lower === 'requests' ||
            lower === 'logs') {
            const options = {};
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
        if (lower.match(/^(show|view|get|display)\s*(request|details|info)/) ||
            lower.match(/^request\s+/)) {
            const idMatch = input.match(/(?:request|id|details?)\s+([a-zA-Z0-9-]+)/i);
            if (idMatch) {
                return { command: 'request', options: {}, args: [idMatch[1]] };
            }
            console.log(chalk_1.default.yellow('Please specify a request ID'));
            console.log(chalk_1.default.gray('Example:') + ' ' + chalk_1.default.cyan('show request abc123'));
            return null;
        }
        // Serve command patterns
        if (lower.match(/^(start|run|serve|launch)\s*(server|backend)?/) ||
            lower === 'serve') {
            const options = {};
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
        if (lower.match(/^(show|view|list|get|display)?\s*(model\s*)?(pricing|cost|price)/) ||
            lower === 'pricing' ||
            lower === 'price') {
            const options = {};
            // Check if it's an edit action
            const editMatch = input.match(/edit|update|modify/i);
            if (editMatch) {
                options.action = 'edit';
            }
            // Parse parameters like --model, --provider, --inputPrice, --outputPrice
            const modelParamMatch = input.match(/--model\s+([^\s]+)/i);
            if (modelParamMatch) {
                options.model = modelParamMatch[1];
            }
            else {
                // Also support "for" syntax as fallback
                const modelMatch = input.match(/(?:model|for)\s+([^\s]+)/i);
                if (modelMatch) {
                    options.model = modelMatch[1];
                }
            }
            const providerParamMatch = input.match(/--provider\s+(openai|anthropic|ollama|gemini)/i);
            if (providerParamMatch) {
                options.provider = providerParamMatch[1].toLowerCase();
            }
            else {
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
    async executeCommand(match) {
        try {
            switch (match.command) {
                case 'stats':
                    await (0, stats_1.statsCommand)(match.options);
                    break;
                case 'requests':
                    await (0, requests_1.requestsCommand)(match.options);
                    break;
                case 'request':
                    if (match.args && match.args[0]) {
                        await (0, requests_1.requestCommand)(match.args[0]);
                    }
                    break;
                case 'serve':
                    (0, serve_1.serveCommand)(match.options);
                    break;
                case 'pricing':
                    await (0, pricing_1.pricingCommand)(match.options);
                    break;
                default:
                    console.log(chalk_1.default.red('Unknown command'));
            }
        }
        catch (error) {
            // Error already handled by command functions
            // Just prevent REPL from crashing
            if (error.message && !error.message.includes('Failed to fetch')) {
                console.error(chalk_1.default.red('Command error:'), error.message);
            }
        }
    }
    showHelp() {
        console.log(chalk_1.default.bold('\nAvailable Commands\n'));
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
            console.log(chalk_1.default.bold.cyan(section.category + ':'));
            section.commands.forEach((cmd) => {
                console.log('  ' + chalk_1.default.cyan(cmd.pattern.padEnd(32)) + chalk_1.default.gray(cmd.description));
            });
            console.log('');
        });
        console.log(chalk_1.default.bold('Tips:'));
        console.log(chalk_1.default.gray('  - Use Tab for command completion'));
        console.log(chalk_1.default.gray('  - Use ↑/↓ arrow keys to navigate command history'));
        console.log('');
    }
    completer(line) {
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
exports.LLMMeterREPL = LLMMeterREPL;
