import { ProcessManager } from './process-manager';
import { ResultFormatter } from './result-formatter';

export interface ClickHouseConfig {
  clientPath?: string;
  host?: string;
  port?: number;
  user?: string;
  password?: string;
  database?: string;
  timeout?: number;
}

export interface QueryResult {
  success: boolean;
  data?: string;
  rowsAffected?: number;
  error?: string;
  durationMs: number;
}

export class ClickHouseExecutor {
  private pm: ProcessManager;
  private formatter: ResultFormatter;
  private config: Required<ClickHouseConfig>;

  constructor(config: ClickHouseConfig = {}) {
    this.pm = new ProcessManager();
    this.formatter = new ResultFormatter();
    this.config = {
      clientPath: config.clientPath || 'clickhouse-client',
      host: config.host || 'localhost',
      port: config.port || 9000,
      user: config.user || 'default',
      password: config.password || '',
      database: config.database || 'default',
      timeout: config.timeout || 30000
    };
  }

  async query(sql: string): Promise<QueryResult> {
    return this.execute(sql);
  }

  async execute(sql: string): Promise<QueryResult> {
    const startTime = Date.now();
    const isDDL = /^\s*(CREATE|ALTER|DROP|TRUNCATE|RENAME)\s/i.test(sql);

    const args: string[] = [
      '--host', this.config.host,
      '--port', String(this.config.port),
      '--user', this.config.user,
      '--database', this.config.database,
      '--format', 'TabSeparated',
      '--query', sql
    ];

    if (this.config.password) {
      args.push('--password', this.config.password);
    }

    try {
      const result = await this.pm.execute(this.config.clientPath, args, {
        timeout: this.config.timeout
      });

      if (result.exitCode !== 0) {
        return {
          success: false,
          error: this.formatter.formatError(result.stderr, result.exitCode ?? -1),
          durationMs: Date.now() - startTime
        };
      }

      const output = result.stdout.trim();
      if (isDDL || !output) {
        return {
          success: true,
          durationMs: Date.now() - startTime
        };
      }

      return {
        success: true,
        data: this.formatter.formatTable(output),
        durationMs: Date.now() - startTime
      };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : String(error),
        durationMs: Date.now() - startTime
      };
    }
  }

  async stop(): Promise<void> {
    await this.pm.cleanup();
  }
}
