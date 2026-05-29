import { ProcessManager } from './process-manager';
import { ResultFormatter } from './result-formatter';
import * as fs from 'fs';
import * as os from 'os';
import * as path from 'path';

export interface SparkConfig {
  sparkSqlPath?: string;
  timeout?: number;
  master?: string;
  catalog?: string;
}

export interface ExecutionResult {
  success: boolean;
  data?: string;
  rowsAffected?: number;
  error?: string;
  durationMs: number;
}

export class SparkExecutor {
  private pm: ProcessManager;
  private formatter: ResultFormatter;
  private config: Required<SparkConfig>;

  constructor(config: SparkConfig = {}) {
    this.pm = new ProcessManager();
    this.formatter = new ResultFormatter();
    this.config = {
      sparkSqlPath: config.sparkSqlPath || 'spark-sql',
      timeout: config.timeout || 60000,
      master: config.master || 'local[*]',
      catalog: config.catalog || 'iceberg'
    };
  }

  async execute(sql: string): Promise<ExecutionResult> {
    const startTime = Date.now();
    const tmpFile = path.join(os.tmpdir(), `spark_sql_${Date.now()}_${process.pid}.sql`);

    try {
      fs.writeFileSync(tmpFile, sql);
      return await this.executeFile(tmpFile, startTime);
    } finally {
      try { fs.unlinkSync(tmpFile); } catch {}
    }
  }

  async executeFile(filePath: string, startTime?: number): Promise<ExecutionResult> {
    const ts = startTime || Date.now();

    try {
      if (!fs.existsSync(filePath)) {
        return {
          success: false,
          error: `File not found: ${filePath}`,
          durationMs: Date.now() - ts
        };
      }

      const result = await this.pm.execute(this.config.sparkSqlPath, [
        '--master', this.config.master,
        '-c', `spark.sql.catalog.${this.config.catalog}=org.apache.iceberg.spark.SparkCatalog`,
        '-f', filePath
      ], { timeout: this.config.timeout });

      if (result.exitCode !== 0) {
        return {
          success: false,
          error: this.formatter.formatError(result.stderr, result.exitCode ?? -1),
          durationMs: Date.now() - ts
        };
      }

      return {
        success: true,
        data: this.formatter.formatTable(result.stdout),
        durationMs: Date.now() - ts
      };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : String(error),
        durationMs: Date.now() - ts
      };
    }
  }

  async explain(sql: string): Promise<ExecutionResult> {
    const startTime = Date.now();
    try {
      const explainSql = `EXPLAIN ${sql}`;
      const result = await this.execute(explainSql);
      if (result.success && result.data) {
        return {
          ...result,
          data: this.formatter.formatSparkExplain(result.data)
        };
      }
      return result;
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
