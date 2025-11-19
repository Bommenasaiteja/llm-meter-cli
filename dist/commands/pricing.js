"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.pricingCommand = pricingCommand;
const axios_1 = __importDefault(require("axios"));
const chalk_1 = __importDefault(require("chalk"));
const ora_1 = __importDefault(require("ora"));
const cli_table3_1 = __importDefault(require("cli-table3"));
const API_URL = process.env.LLM_METER_API || 'http://localhost:3001/api';
async function pricingCommand(options) {
    if (options.action === 'edit' || options.action === 'update') {
        await editPricingCommand(options);
    }
    else if (options.action === 'view') {
        await viewPricingCommand(options);
    }
    else {
        // Default behavior - if inputPrice or outputPrice is provided, treat as edit action
        if (options.inputPrice || options.outputPrice) {
            await editPricingCommand(options);
        }
        else {
            await viewPricingCommand(options);
        }
    }
}
async function viewPricingCommand(options) {
    const spinner = (0, ora_1.default)('Fetching pricing information...').start();
    try {
        const { data } = await axios_1.default.get(`${API_URL}/config/pricing`);
        // Apply client-side filtering since backend doesn't support query parameters for filtering
        let filteredData = data;
        if (options.model) {
            filteredData = filteredData.filter((price) => price.model.toLowerCase().includes(options.model.toLowerCase()));
        }
        if (options.provider) {
            filteredData = filteredData.filter((price) => price.provider.toLowerCase().includes(options.provider.toLowerCase()));
        }
        spinner.succeed('Pricing information fetched successfully');
        console.log('\n' + chalk_1.default.bold.blue('LLM Meter - Model Pricing') + '\n');
        if (!filteredData || filteredData.length === 0) {
            console.log(chalk_1.default.yellow('No pricing information found.'));
            console.log(chalk_1.default.gray('Pricing might need to be configured in the backend.\n'));
            return;
        }
        // Create table for pricing
        const pricingTable = new cli_table3_1.default({
            head: [
                chalk_1.default.cyan('Provider'),
                chalk_1.default.cyan('Model'),
                chalk_1.default.cyan('Input Cost ($/1K tokens)'),
                chalk_1.default.cyan('Output Cost ($/1K tokens)'),
                chalk_1.default.cyan('Last Updated'),
            ],
            colWidths: [15, 25, 20, 20, 20],
        });
        filteredData.forEach((price) => {
            pricingTable.push([
                getProviderColor(price.provider),
                chalk_1.default.white(price.model),
                chalk_1.default.green(price.inputCostPer1k?.toFixed(6) || 'N/A'),
                chalk_1.default.green(price.outputCostPer1k?.toFixed(6) || 'N/A'),
                chalk_1.default.gray(new Date(price.updatedAt || price.createdAt).toLocaleDateString()),
            ]);
        });
        console.log(pricingTable.toString());
        console.log('\n' + chalk_1.default.gray('💡 Tips:'));
        console.log(chalk_1.default.gray('  • Update pricing: ') + chalk_1.default.cyan('llm-meter pricing --action edit --model <model> --inputPrice <cost-per-1k>'));
        console.log(chalk_1.default.gray('  • Filter by provider: ') + chalk_1.default.cyan('llm-meter pricing --provider openai'));
        console.log(chalk_1.default.gray('  • Filter by model: ') + chalk_1.default.cyan('llm-meter pricing --model gpt-4'));
        // Only add newline if not in REPL mode
        if (process.env.LLM_METER_REPL !== 'true') {
            console.log('');
        }
    }
    catch (error) {
        spinner.fail('Failed to fetch pricing information');
        console.error(chalk_1.default.red('\nError:'), error.message);
        console.log(chalk_1.default.yellow('\nMake sure the LLM Meter backend is running on'), chalk_1.default.cyan(API_URL));
        // Don't exit if running in REPL mode
        if (process.env.LLM_METER_REPL !== 'true') {
            process.exit(1);
        }
    }
}
async function editPricingCommand(options) {
    if (!options.model) {
        console.error(chalk_1.default.red('\nError: Model name is required for editing pricing.'));
        console.log(chalk_1.default.yellow('Usage: llm-meter pricing --action edit --model <model-name> [--provider <provider>] [--inputPrice <cost-per-1k>] [--outputPrice <cost-per-1k>]'));
        console.log(chalk_1.default.gray('Example: llm-meter pricing --action edit --model gpt-4 --inputPrice 0.01 --outputPrice 0.03'));
        if (process.env.LLM_METER_REPL !== 'true') {
            process.exit(1);
        }
        return;
    }
    // Validate that at least one price is provided
    if (!options.inputPrice && !options.outputPrice) {
        console.error(chalk_1.default.red('\nError: At least one cost (inputPrice or outputPrice) must be provided for editing.'));
        console.log(chalk_1.default.yellow('Usage: llm-meter pricing --action edit --model <model-name> --inputPrice <cost-per-1k> [--outputPrice <cost-per-1k>]'));
        console.log(chalk_1.default.gray('Example: llm-meter pricing --action edit --model gpt-4 --inputPrice 0.01 --outputPrice 0.03'));
        if (process.env.LLM_METER_REPL !== 'true') {
            process.exit(1);
        }
        return;
    }
    const spinner = (0, ora_1.default)(`Updating pricing for model: ${options.model}`).start();
    try {
        // Prepare update payload
        const updateData = {
            model: options.model,
            provider: options.provider || (options.model.includes('gpt') ? 'openai' : options.model.includes('claude') ? 'anthropic' : 'unknown'),
        };
        if (options.inputPrice) {
            const inputPrice = parseFloat(options.inputPrice);
            if (isNaN(inputPrice)) {
                throw new Error(`Invalid input price: ${options.inputPrice}`);
            }
            updateData.inputCostPer1k = inputPrice;
        }
        if (options.outputPrice) {
            const outputPrice = parseFloat(options.outputPrice);
            if (isNaN(outputPrice)) {
                throw new Error(`Invalid output price: ${options.outputPrice}`);
            }
            updateData.outputCostPer1k = outputPrice;
        }
        // First try to fetch existing pricing by model and provider
        let existingPricing = null;
        try {
            const existingResponse = await axios_1.default.get(`${API_URL}/config/pricing`, {
                params: {
                    model: options.model,
                    provider: updateData.provider
                }
            });
            if (existingResponse.data && existingResponse.data.length > 0) {
                existingPricing = existingResponse.data[0];
            }
        }
        catch (fetchError) {
            // If fetching existing pricing fails, we'll create new
            console.log(chalk_1.default.gray('  No existing pricing found, creating new entry...'));
        }
        let result;
        if (existingPricing) {
            // Update existing pricing
            result = await axios_1.default.put(`${API_URL}/config/pricing/${existingPricing.id}`, updateData);
            spinner.succeed(`Pricing updated for model: ${options.model}`);
        }
        else {
            // Create new pricing
            result = await axios_1.default.post(`${API_URL}/config/pricing`, updateData);
            spinner.succeed(`New pricing created for model: ${options.model}`);
        }
        console.log(chalk_1.default.green(`\nPricing details:`));
        console.log(chalk_1.default.gray(`  Model: ${options.model}`));
        console.log(chalk_1.default.gray(`  Provider: ${updateData.provider}`));
        if (options.inputPrice) {
            console.log(chalk_1.default.gray(`  Input Cost: $${updateData.inputCostPer1k}/1K tokens`));
        }
        if (options.outputPrice) {
            console.log(chalk_1.default.gray(`  Output Cost: $${updateData.outputCostPer1k}/1K tokens`));
        }
        console.log(chalk_1.default.gray('\nTo view updated pricing: ') + chalk_1.default.cyan('llm-meter pricing\n'));
    }
    catch (error) {
        spinner.fail(`Failed to update pricing for model: ${options.model}`);
        console.error(chalk_1.default.red('\nError:'), error.message);
        if (error.response) {
            console.error(chalk_1.default.red('Response data:'), error.response.data);
            console.error(chalk_1.default.red('Response status:'), error.response.status);
            console.error(chalk_1.default.red('Response headers:'), error.response.headers);
        }
        console.log(chalk_1.default.yellow('\nMake sure the LLM Meter backend is running on'), chalk_1.default.cyan(API_URL));
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
