import axios from 'axios';
import chalk from 'chalk';
import ora from 'ora';
import Table from 'cli-table3';

const API_URL = process.env.LLM_METER_API || 'http://localhost:3001/api';

export async function pricingCommand(options: { action?: string, model?: string, provider?: string, inputPrice?: string, outputPrice?: string }) {
  if (options.action === 'edit' || options.action === 'update') {
    await editPricingCommand(options);
  } else if (options.action === 'view') {
    await viewPricingCommand(options);
  } else {
    // Default behavior - if inputPrice or outputPrice is provided, treat as edit action
    if (options.inputPrice || options.outputPrice) {
      await editPricingCommand(options);
    } else {
      await viewPricingCommand(options);
    }
  }
}

async function viewPricingCommand(options: { model?: string, provider?: string }) {
  const spinner = ora('Fetching pricing information...').start();

  try {
    const { data } = await axios.get(`${API_URL}/config/pricing`);

    // Apply client-side filtering since backend doesn't support query parameters for filtering
    let filteredData = data;
    if (options.model) {
      filteredData = filteredData.filter((price: any) =>
        price.model.toLowerCase().includes(options.model!.toLowerCase())
      );
    }
    if (options.provider) {
      filteredData = filteredData.filter((price: any) =>
        price.provider.toLowerCase().includes(options.provider!.toLowerCase())
      );
    }

    spinner.succeed('Pricing information fetched successfully');

    console.log('\n' + chalk.bold.blue('LLM Meter - Model Pricing') + '\n');

    if (!filteredData || filteredData.length === 0) {
      console.log(chalk.yellow('No pricing information found.'));
      console.log(chalk.gray('Pricing might need to be configured in the backend.\n'));
      return;
    }

    // Create table for pricing
    const pricingTable = new Table({
      head: [
        chalk.cyan('Provider'),
        chalk.cyan('Model'),
        chalk.cyan('Input Cost ($/1K tokens)'),
        chalk.cyan('Output Cost ($/1K tokens)'),
        chalk.cyan('Last Updated'),
      ],
      colWidths: [15, 25, 20, 20, 20],
    });

    filteredData.forEach((price: any) => {
      pricingTable.push([
        getProviderColor(price.provider),
        chalk.white(price.model),
        chalk.green(price.inputCostPer1k?.toFixed(6) || 'N/A'),
        chalk.green(price.outputCostPer1k?.toFixed(6) || 'N/A'),
        chalk.gray(new Date(price.updatedAt || price.createdAt).toLocaleDateString()),
      ]);
    });

    console.log(pricingTable.toString());

    console.log('\n' + chalk.gray('💡 Tips:'));
    console.log(chalk.gray('  • Update pricing: ') + chalk.cyan('llm-meter pricing --action edit --model <model> --inputPrice <cost-per-1k>'));
    console.log(chalk.gray('  • Filter by provider: ') + chalk.cyan('llm-meter pricing --provider openai'));
    console.log(chalk.gray('  • Filter by model: ') + chalk.cyan('llm-meter pricing --model gpt-4'));

    // Only add newline if not in REPL mode
    if (process.env.LLM_METER_REPL !== 'true') {
      console.log('');
    }
  } catch (error: any) {
    spinner.fail('Failed to fetch pricing information');
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

async function editPricingCommand(options: { model?: string, provider?: string, inputPrice?: string, outputPrice?: string }) {
  if (!options.model) {
    console.error(chalk.red('\nError: Model name is required for editing pricing.'));
    console.log(chalk.yellow('Usage: llm-meter pricing --action edit --model <model-name> [--provider <provider>] [--inputPrice <cost-per-1k>] [--outputPrice <cost-per-1k>]'));
    console.log(chalk.gray('Example: llm-meter pricing --action edit --model gpt-4 --inputPrice 0.01 --outputPrice 0.03'));
    if (process.env.LLM_METER_REPL !== 'true') {
      process.exit(1);
    }
    return;
  }

  // Validate that at least one price is provided
  if (!options.inputPrice && !options.outputPrice) {
    console.error(chalk.red('\nError: At least one cost (inputPrice or outputPrice) must be provided for editing.'));
    console.log(chalk.yellow('Usage: llm-meter pricing --action edit --model <model-name> --inputPrice <cost-per-1k> [--outputPrice <cost-per-1k>]'));
    console.log(chalk.gray('Example: llm-meter pricing --action edit --model gpt-4 --inputPrice 0.01 --outputPrice 0.03'));
    if (process.env.LLM_METER_REPL !== 'true') {
      process.exit(1);
    }
    return;
  }

  const spinner = ora(`Updating pricing for model: ${options.model}`).start();

  try {
    // Prepare update payload
    const updateData: any = {
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
      const existingResponse = await axios.get(`${API_URL}/config/pricing`, {
        params: {
          model: options.model,
          provider: updateData.provider
        }
      });

      if (existingResponse.data && existingResponse.data.length > 0) {
        existingPricing = existingResponse.data[0];
      }
    } catch (fetchError) {
      // If fetching existing pricing fails, we'll create new
      console.log(chalk.gray('  No existing pricing found, creating new entry...'));
    }

    let result;
    if (existingPricing) {
      // Update existing pricing
      result = await axios.put(`${API_URL}/config/pricing/${existingPricing.id}`, updateData);
      spinner.succeed(`Pricing updated for model: ${options.model}`);
    } else {
      // Create new pricing
      result = await axios.post(`${API_URL}/config/pricing`, updateData);
      spinner.succeed(`New pricing created for model: ${options.model}`);
    }

    console.log(chalk.green(`\nPricing details:`));
    console.log(chalk.gray(`  Model: ${options.model}`));
    console.log(chalk.gray(`  Provider: ${updateData.provider}`));
    if (options.inputPrice) {
      console.log(chalk.gray(`  Input Cost: $${updateData.inputCostPer1k}/1K tokens`));
    }
    if (options.outputPrice) {
      console.log(chalk.gray(`  Output Cost: $${updateData.outputCostPer1k}/1K tokens`));
    }

    console.log(chalk.gray('\nTo view updated pricing: ') + chalk.cyan('llm-meter pricing\n'));
  } catch (error: any) {
    spinner.fail(`Failed to update pricing for model: ${options.model}`);
    console.error(chalk.red('\nError:'), error.message);
    if (error.response) {
      console.error(chalk.red('Response data:'), error.response.data);
      console.error(chalk.red('Response status:'), error.response.status);
      console.error(chalk.red('Response headers:'), error.response.headers);
    }
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