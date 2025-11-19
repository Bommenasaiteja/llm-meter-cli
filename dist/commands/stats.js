"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.statsCommand = statsCommand;
const axios_1 = __importDefault(require("axios"));
const chalk_1 = __importDefault(require("chalk"));
const ora_1 = __importDefault(require("ora"));
const cli_table3_1 = __importDefault(require("cli-table3"));
const API_URL = process.env.LLM_METER_API || 'http://localhost:3001/api';
async function statsCommand(options) {
    const spinner = (0, ora_1.default)('Fetching statistics...').start();
    try {
        const { data } = await axios_1.default.get(`${API_URL}/analytics/stats`, {
            params: {
                project: options.project,
            },
        });
        spinner.succeed('Statistics fetched successfully');
        console.log('\n' + chalk_1.default.bold.blue('LLM Meter - Usage Statistics') + '\n');
        // Summary table
        const summaryTable = new cli_table3_1.default({
            head: [chalk_1.default.cyan('Metric'), chalk_1.default.cyan('Value')],
        });
        summaryTable.push(['Total Cost', chalk_1.default.green(`$${data.totalCost.toFixed(4)}`)], ['Total Tokens', chalk_1.default.yellow(data.totalTokens.toLocaleString())], ['Total Requests', chalk_1.default.magenta(data.totalRequests.toLocaleString())], [
            'Avg Cost/Request',
            chalk_1.default.green(`$${(data.totalCost / Math.max(data.totalRequests, 1)).toFixed(6)}`),
        ]);
        console.log(summaryTable.toString());
        // Model breakdown
        if (data.byModel && data.byModel.length > 0) {
            console.log('\n' + chalk_1.default.bold('By Model:') + '\n');
            const modelTable = new cli_table3_1.default({
                head: [
                    chalk_1.default.cyan('Provider'),
                    chalk_1.default.cyan('Model'),
                    chalk_1.default.cyan('Requests'),
                    chalk_1.default.cyan('Tokens'),
                    chalk_1.default.cyan('Cost'),
                    chalk_1.default.cyan('Avg Latency'),
                ],
            });
            data.byModel.forEach((model) => {
                modelTable.push([
                    model.provider,
                    model.model,
                    model.requestCount.toLocaleString(),
                    model.totalTokens.toLocaleString(),
                    chalk_1.default.green(`$${model.totalCost.toFixed(4)}`),
                    `${model.avgLatencyMs.toFixed(0)}ms`,
                ]);
            });
            console.log(modelTable.toString());
        }
        // Project breakdown
        if (data.byProject && data.byProject.length > 0 && !options.project) {
            console.log('\n' + chalk_1.default.bold('By Project:') + '\n');
            const projectTable = new cli_table3_1.default({
                head: [
                    chalk_1.default.cyan('Project'),
                    chalk_1.default.cyan('Requests'),
                    chalk_1.default.cyan('Tokens'),
                    chalk_1.default.cyan('Cost'),
                    chalk_1.default.cyan('Models'),
                ],
            });
            data.byProject.forEach((project) => {
                projectTable.push([
                    project.project,
                    project.requestCount.toLocaleString(),
                    project.totalTokens.toLocaleString(),
                    chalk_1.default.green(`$${project.totalCost.toFixed(4)}`),
                    project.models.join(', '),
                ]);
            });
            console.log(projectTable.toString());
        }
        // Function breakdown
        try {
            const functionsData = await axios_1.default.get(`${API_URL}/analytics/functions`, {
                params: {
                    project: options.project,
                },
            });
            if (functionsData.data && functionsData.data.length > 0) {
                console.log('\n' + chalk_1.default.bold('By Function:') + '\n');
                const functionTable = new cli_table3_1.default({
                    head: [
                        chalk_1.default.cyan('Function'),
                        chalk_1.default.cyan('Requests'),
                        chalk_1.default.cyan('Input'),
                        chalk_1.default.cyan('Output'),
                        chalk_1.default.cyan('Total'),
                        chalk_1.default.cyan('Cost'),
                        chalk_1.default.cyan('Avg Latency'),
                    ],
                });
                functionsData.data.forEach((func) => {
                    functionTable.push([
                        chalk_1.default.cyan(func.functionName),
                        func.requestCount.toLocaleString(),
                        func.inputTokens.toLocaleString(),
                        func.outputTokens.toLocaleString(),
                        func.totalTokens.toLocaleString(),
                        chalk_1.default.green(`$${func.totalCost.toFixed(4)}`),
                        `${func.avgLatencyMs.toFixed(0)}ms`,
                    ]);
                });
                console.log(functionTable.toString());
            }
        }
        catch (funcError) {
            // Silently ignore if functions endpoint doesn't exist yet
        }
        // Only add newline if not in REPL mode
        if (process.env.LLM_METER_REPL !== 'true') {
            console.log('');
        }
    }
    catch (error) {
        spinner.fail('Failed to fetch statistics');
        console.error(chalk_1.default.red('\nError:'), error.message);
        console.log(chalk_1.default.yellow('\nMake sure the LLM Meter backend is running on'), chalk_1.default.cyan(API_URL));
        // Don't exit if running in REPL mode
        if (process.env.LLM_METER_REPL !== 'true') {
            process.exit(1);
        }
    }
}
