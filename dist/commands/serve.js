"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.serveCommand = serveCommand;
const chalk_1 = __importDefault(require("chalk"));
function serveCommand(options) {
    console.log(chalk_1.default.blue.bold('\nLLM Meter Server\n'));
    console.log(chalk_1.default.yellow('To start the servers, run these commands:\n'));
    console.log(chalk_1.default.cyan('Backend:'));
    console.log(`  cd apps/backend && PORT=${options.port} pnpm dev\n`);
    console.log(chalk_1.default.cyan('Dashboard:'));
    console.log(`  cd apps/dashboard && pnpm dev\n`);
    console.log(chalk_1.default.gray('Or use the monorepo scripts:'));
    console.log(chalk_1.default.gray('  pnpm backend:dev'));
    console.log(chalk_1.default.gray('  pnpm dashboard:dev'));
    console.log('');
}
