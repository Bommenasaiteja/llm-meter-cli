"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.requestsCommand = requestsCommand;
exports.requestCommand = requestCommand;
const axios_1 = __importDefault(require("axios"));
const chalk_1 = __importDefault(require("chalk"));
const ora_1 = __importDefault(require("ora"));
const cli_table3_1 = __importDefault(require("cli-table3"));
const date_fns_1 = require("date-fns");
const API_URL = process.env.LLM_METER_API || 'http://localhost:3001/api';
async function requestsCommand(options) {
    const spinner = (0, ora_1.default)('Fetching requests...').start();
    try {
        const { data } = await axios_1.default.get(`${API_URL}/analytics/requests`, {
            params: {
                page: options.page || 1,
                limit: options.limit || 20,
                project: options.project,
                provider: options.provider,
                model: options.model,
            },
        });
        spinner.succeed('Requests fetched successfully');
        console.log('\n' + chalk_1.default.bold.blue('LLM Meter - Request Logs') + '\n');
        if (data.requests.length === 0) {
            console.log(chalk_1.default.yellow('No requests found.'));
            console.log(chalk_1.default.gray('Make some API calls to see them here.\n'));
            return;
        }
        // Summary
        console.log(chalk_1.default.gray(`Showing ${data.requests.length} of ${data.pagination.total} requests (Page ${data.pagination.page}/${data.pagination.totalPages})`) + '\n');
        // Requests table
        const table = new cli_table3_1.default({
            head: [
                chalk_1.default.cyan('ID'),
                chalk_1.default.cyan('Time'),
                chalk_1.default.cyan('Function'),
                chalk_1.default.cyan('Project'),
                chalk_1.default.cyan('Provider'),
                chalk_1.default.cyan('Model'),
                chalk_1.default.cyan('In'),
                chalk_1.default.cyan('Out'),
                chalk_1.default.cyan('Total'),
                chalk_1.default.cyan('Cost'),
            ],
            colWidths: [6, 16, 16, 14, 10, 16, 7, 7, 7, 10],
        });
        data.requests.forEach((req) => {
            const timeAgo = (0, date_fns_1.formatDistanceToNow)(new Date(req.timestamp), {
                addSuffix: true,
            });
            table.push([
                chalk_1.default.gray(req.id),
                chalk_1.default.gray(timeAgo),
                chalk_1.default.cyan(req.functionName || '-'),
                req.project,
                getProviderColor(req.provider),
                chalk_1.default.gray(req.model),
                chalk_1.default.yellow(formatTokens(req.inputTokens)),
                chalk_1.default.green(formatTokens(req.outputTokens)),
                chalk_1.default.white(formatTokens(req.totalTokens)),
                chalk_1.default.green(`$${(req.cost || 0).toFixed(4)}`),
            ]);
        });
        console.log(table.toString());
        // Navigation hints
        console.log('');
        if (data.pagination.hasNext || data.pagination.hasPrev) {
            const hints = [];
            if (data.pagination.hasPrev) {
                hints.push(chalk_1.default.gray(`Previous: `) +
                    chalk_1.default.cyan(`llm-meter requests --page ${data.pagination.page - 1}`));
            }
            if (data.pagination.hasNext) {
                hints.push(chalk_1.default.gray(`Next: `) +
                    chalk_1.default.cyan(`llm-meter requests --page ${data.pagination.page + 1}`));
            }
            console.log(hints.join(' | ') + '\n');
        }
        // Tips
        console.log(chalk_1.default.gray('💡 Tips:'));
        console.log(chalk_1.default.gray('  • View details: ') +
            chalk_1.default.cyan('llm-meter request <id>'));
        console.log(chalk_1.default.gray('  • Filter by project: ') +
            chalk_1.default.cyan('llm-meter requests --project <name>'));
        console.log(chalk_1.default.gray('  • Filter by provider: ') +
            chalk_1.default.cyan('llm-meter requests --provider openai'));
        // Only add newline if not in REPL mode
        if (process.env.LLM_METER_REPL !== 'true') {
            console.log('');
        }
    }
    catch (error) {
        spinner.fail('Failed to fetch requests');
        console.error(chalk_1.default.red('\nError:'), error.message);
        console.log(chalk_1.default.yellow('\nMake sure the LLM Meter backend is running on'), chalk_1.default.cyan(API_URL));
        // Don't exit if running in REPL mode
        if (process.env.LLM_METER_REPL !== 'true') {
            process.exit(1);
        }
    }
}
async function requestCommand(id) {
    const spinner = (0, ora_1.default)(`Fetching request ${id}...`).start();
    try {
        const { data } = await axios_1.default.get(`${API_URL}/analytics/requests/${id}`);
        spinner.succeed('Request details fetched successfully');
        console.log('\n' + chalk_1.default.bold.blue('Request Details') + '\n');
        // Metadata
        const metaTable = new cli_table3_1.default({
            head: [chalk_1.default.cyan('Property'), chalk_1.default.cyan('Value')],
        });
        metaTable.push(['ID', chalk_1.default.white(data.id)], ['Timestamp', new Date(data.timestamp).toLocaleString()], ['Time Ago', (0, date_fns_1.formatDistanceToNow)(new Date(data.timestamp), { addSuffix: true })], ['Project', chalk_1.default.white(data.project)], ['Function', chalk_1.default.cyan(data.functionName || 'Not specified')], ['Provider', getProviderColor(data.provider)], ['Model', chalk_1.default.white(data.model)], ['Latency', chalk_1.default.yellow(`${data.latencyMs}ms`)]);
        console.log(metaTable.toString());
        // Token & Cost breakdown
        console.log('\n' + chalk_1.default.bold('Token Usage & Cost:') + '\n');
        const tokenTable = new cli_table3_1.default({
            head: [chalk_1.default.cyan('Metric'), chalk_1.default.cyan('Value')],
        });
        tokenTable.push(['Input Tokens', chalk_1.default.yellow(data.inputTokens.toLocaleString())], ['Output Tokens', chalk_1.default.green(data.outputTokens.toLocaleString())], ['Total Tokens', chalk_1.default.white.bold(data.totalTokens.toLocaleString())], ['Cost', chalk_1.default.green.bold(`$${(data.cost || 0).toFixed(6)}`)]);
        console.log(tokenTable.toString());
        // Prompt preview
        if (data.promptPreview) {
            console.log('\n' + chalk_1.default.bold('Prompt Preview:') + '\n');
            console.log(chalk_1.default.gray('─'.repeat(60)));
            console.log(chalk_1.default.white(data.promptPreview));
            if (data.promptPreview.length >= 200) {
                console.log(chalk_1.default.gray('... (truncated)'));
            }
            console.log(chalk_1.default.gray('─'.repeat(60)));
        }
        // Response preview
        if (data.responsePreview) {
            console.log('\n' + chalk_1.default.bold('Response Preview:') + '\n');
            console.log(chalk_1.default.gray('─'.repeat(60)));
            console.log(chalk_1.default.white(data.responsePreview));
            if (data.responsePreview.length >= 200) {
                console.log(chalk_1.default.gray('... (truncated)'));
            }
            console.log(chalk_1.default.gray('─'.repeat(60)));
        }
        // Metadata
        if (data.metadata && Object.keys(data.metadata).length > 0) {
            console.log('\n' + chalk_1.default.bold('Metadata:') + '\n');
            console.log(chalk_1.default.gray(JSON.stringify(data.metadata, null, 2)));
        }
        // Only add newline if not in REPL mode
        if (process.env.LLM_METER_REPL !== 'true') {
            console.log('');
        }
    }
    catch (error) {
        spinner.fail('Failed to fetch request details');
        if (error.response?.status === 404) {
            console.error(chalk_1.default.red(`\nRequest with ID ${id} not found.`));
            console.log(chalk_1.default.yellow('Use'), chalk_1.default.cyan('llm-meter requests'), chalk_1.default.yellow('to see available requests.\n'));
        }
        else {
            console.error(chalk_1.default.red('\nError:'), error.message);
            console.log(chalk_1.default.yellow('\nMake sure the LLM Meter backend is running on'), chalk_1.default.cyan(API_URL));
        }
        // Don't exit if running in REPL mode
        if (process.env.LLM_METER_REPL !== 'true') {
            process.exit(1);
        }
    }
}
function getProviderColor(provider) {
    const colors = {
        openai: chalk_1.default.green,
        anthropic: chalk_1.default.magenta,
        ollama: chalk_1.default.blue,
        gemini: chalk_1.default.yellow,
    };
    const colorFn = colors[provider] || chalk_1.default.white;
    return colorFn(provider);
}
function formatTokens(tokens) {
    if (tokens >= 1000) {
        return `${(tokens / 1000).toFixed(1)}k`;
    }
    return tokens.toString();
}
