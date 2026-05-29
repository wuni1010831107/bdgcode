import * as fs from 'fs';
import * as path from 'path';
import * as readline from 'readline';
import chalk from 'chalk';
import { SessionManager } from '../agent/session';
import { Memory } from '../agent/memory';
import { loadConfig } from '../config';
import { SQLGenerator } from '../tools/sql/generator';
import { SecurityScanner } from '../tools/security/scanner';
import { TelemetryCollector } from '../agent/telemetry';
import { FileWriter } from '../tools/file/writer';

export interface REPLContext {
  sessionManager: SessionManager;
  memory: Memory;
  config: ReturnType<typeof loadConfig>;
}

export class REPL {
  private context: REPLContext;
  private running: boolean = false;
  private llm: any = null;
  private telemetry: TelemetryCollector;

  constructor(context: REPLContext) {
    this.context = context;
    this.telemetry = new TelemetryCollector();
  }

  start(): void {
    this.running = true;
    this.telemetry.startSession();
    console.log(chalk.cyan.bold('\n🚀 DataDev Agent Ready\n'));
    console.log(chalk.gray('Type your data engineering task, or /help for commands\n'));

    const rl = readline.createInterface({
      input: process.stdin,
      output: process.stdout,
      prompt: chalk.green('datadev> ')
    });

    rl.prompt();

    rl.on('line', async (input) => {
      const trimmed = input.trim();
      if (!trimmed) {
        rl.prompt();
        return;
      }

      if (trimmed === '/exit' || trimmed === '/quit') {
        this.context.sessionManager.saveSession();
        this.telemetry.endSession();
        console.log(chalk.yellow('Session saved. Goodbye!'));
        this.running = false;
        rl.close();
        process.exit(0);
      }

      if (trimmed === '/help') {
        this.showHelp();
        rl.prompt();
        return;
      }

      try {
        await this.processInput(trimmed);
      } catch (error) {
        console.error(chalk.red(`\n❌ Error: ${error instanceof Error ? error.message : String(error)}`));
        this.telemetry.recordToolCall({
          toolName: 'repl',
          params: { input: trimmed },
          resultStatus: 'error',
          executionTimeMs: 0,
          errorType: error instanceof Error ? error.name : 'unknown'
        });
      }

      rl.prompt();
    });

    rl.on('close', () => {
      this.telemetry.endSession();
      process.exit(0);
    });
  }

  private async processInput(input: string): Promise<void> {
    this.context.sessionManager.addMessage('user', input);
    const trimmed = input.trim();

    if (trimmed.startsWith('/sql ')) {
      const args = trimmed.slice(5);
      console.log(chalk.blue('\n💭 Generating SQL...\n'));

      const { Planner } = await import('../agent/planner');
      const { Executor } = await import('../agent/executor');

      const llm = this.getLLM();
      const planner = new Planner(llm, this.context.memory);
      const executor = new Executor(planner, this.context.memory);

      const startTime = Date.now();
      const result = await executor.execute(args);
      const elapsed = Date.now() - startTime;

      console.log(chalk.cyan(result.output));

      if (result.artifacts && result.artifacts.length > 0) {
        console.log(chalk.gray('\n📄 Generated files:'));
        for (const artifact of result.artifacts) {
          console.log(chalk.gray(`  - ${artifact}`));
        }
      }

      this.telemetry.recordToolCall({
        toolName: 'sql-generator',
        params: { input: args },
        resultStatus: result.success ? 'success' : 'error',
        executionTimeMs: elapsed
      });

      this.context.sessionManager.addMessage('assistant', result.output);
    } else if (trimmed.startsWith('/security')) {
      const args = trimmed.includes(' ') ? trimmed.split(' ')[1] : '';
      console.log(chalk.blue('\n🔒 Security Scan\n'));

      const scanner = new SecurityScanner(this.context.config.security.sensitivePatternsPath);

      const mockColumns = [
        { name: 'user_id', type: 'STRING' },
        { name: 'phone_number', type: 'STRING' },
        { name: 'email', type: 'STRING' },
        { name: 'create_time', type: 'TIMESTAMP' }
      ];

      const result = scanner.scanTable(args || 'unknown_table', mockColumns);

      console.log(chalk.red(`Risk Level: ${result.riskLevel.toUpperCase()}\n`));
      console.log('Sensitive fields detected:');
      for (const field of result.fields) {
        console.log(chalk.yellow(`  - ${field.name}: ${field.description} (${field.severity})`));
      }
      console.log('');
      console.log('Recommendations:');
      for (const rec of result.recommendations) {
        console.log(chalk.gray(`  • ${rec}`));
      }

      this.context.sessionManager.addMessage('assistant', `Security scan for ${args || 'unknown_table'}: ${result.fields.length} sensitive fields found.`);
    } else if (trimmed === '/stats') {
      console.log(chalk.blue('\n📊 Agent Statistics\n'));
      const stats = this.telemetry.getStats();
      console.log(chalk.gray('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n'));
      console.log(`Sessions:     ${stats.totalSessions}`);
      console.log(`Tasks:        ${stats.totalTasks}`);
      console.log(`Tool Calls:   ${stats.totalToolCalls}`);
      console.log(chalk.gray('\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n'));
      console.log(chalk.gray('Data collection in progress.'));
      console.log(chalk.gray('Statistics will be more meaningful after 50+ tasks.\n'));
    } else {
      console.log(chalk.blue('\n💭 Thinking...\n'));

      const { Planner } = await import('../agent/planner');
      const { Executor } = await import('../agent/executor');

      const llm = this.getLLM();
      const planner = new Planner(llm, this.context.memory);
      const executor = new Executor(planner, this.context.memory);

      const startTime = Date.now();
      const result = await executor.execute(trimmed);
      const elapsed = Date.now() - startTime;

      console.log(chalk.cyan(result.output));

      if (result.artifacts && result.artifacts.length > 0) {
        console.log(chalk.gray('\n📄 Generated files:'));
        for (const artifact of result.artifacts) {
          console.log(chalk.gray(`  - ${artifact}`));
        }
      }

      this.telemetry.recordToolCall({
        toolName: 'executor',
        params: { input: trimmed },
        resultStatus: result.success ? 'success' : 'error',
        executionTimeMs: elapsed
      });

      this.context.sessionManager.addMessage('assistant', result.output);
    }

    console.log('');
  }

  private getLLM() {
    if (!this.llm) {
      const { createLLMProvider } = require('../llm/provider');
      this.llm = createLLMProvider(this.context.config.llm);
    }
    return this.llm;
  }

  private showHelp(): void {
    console.log(chalk.cyan('\n📋 Available Commands:'));
    console.log('  /help        Show this help message');
    console.log('  /sql <task>  Generate SQL for a data task');
    console.log('  /security    Scan for sensitive data');
    console.log('  /stats       Show agent usage statistics');
    console.log('  /exit        Exit the agent\n');
  }
}
