import chalk from 'chalk';

export function serveCommand(options: { port?: string; dashboardPort?: string }) {
  console.log(chalk.blue.bold('\nLLM Meter Server\n'));
  console.log(chalk.yellow('To start the servers, run these commands:\n'));
  console.log(chalk.cyan('Backend:'));
  console.log(`  cd apps/backend && PORT=${options.port} pnpm dev\n`);
  console.log(chalk.cyan('Dashboard:'));
  console.log(`  cd apps/dashboard && pnpm dev\n`);
  console.log(chalk.gray('Or use the monorepo scripts:'));
  console.log(chalk.gray('  pnpm backend:dev'));
  console.log(chalk.gray('  pnpm dashboard:dev'));
  console.log('');
}
