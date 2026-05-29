import * as path from 'path';
import { Planner, Plan, PlanStep } from './planner';
import { Memory } from './memory';
import { FileWriter } from '../tools/file/writer';
import { SecurityScanner } from '../tools/security/scanner';
import { SparkExecutor } from '../tools/execution/spark-executor';
import { FlinkExecutor } from '../tools/execution/flink-executor';
import { ClickHouseExecutor } from '../tools/execution/clickhouse-executor';

export interface ExecutionResult {
  success: boolean;
  output: string;
  artifacts?: string[];
  errors?: string[];
}

export class Executor {
  private planner: Planner;
  private memory: Memory;
  private writer: FileWriter;
  private sparkExecutor: SparkExecutor | null = null;
  private flinkExecutor: FlinkExecutor | null = null;
  private clickHouseExecutor: ClickHouseExecutor | null = null;

  constructor(planner: Planner, memory: Memory) {
    this.planner = planner;
    this.memory = memory;
    this.writer = new FileWriter();
  }

  async execute(userInput: string): Promise<ExecutionResult> {
    const plan = await this.planner.plan(userInput);

    if (plan.confidence < 0.5) {
      return {
        success: false,
        output: 'I\'m not sure how to help with that. Could you provide more details?'
      };
    }

    const results: string[] = [];
    const artifacts: string[] = [];

    for (const step of plan.steps) {
      const stepResult = await this.executeStep(step);
      results.push(stepResult.output);
      if (stepResult.artifacts) {
        artifacts.push(...stepResult.artifacts);
      }
    }

    return {
      success: true,
      output: results.join('\n\n'),
      artifacts
    };
  }

  private async executeStep(step: PlanStep): Promise<{ output: string; artifacts?: string[] }> {
    switch (step.action) {
      case 'generate-iceberg-ddl':
        return this.generateIcebergDDL(step.params);
      case 'security-scan':
        return this.securityScan(step.params);
      case 'generate-clickhouse-ddl':
        return this.generateClickHouseDDL(step.params);
      case 'generate-spark-sql':
        return this.generateSparkSQL(step.params);
      case 'execute-spark-sql':
        return this.executeSparkSQL(step.params);
      case 'execute-flink-sql':
        return this.executeFlinkSQL(step.params);
      case 'execute-clickhouse-query':
        return this.executeClickHouseQuery(step.params);
      default:
        return { output: `Action "${step.action}" not yet implemented in MVP.` };
    }
  }

  private async generateIcebergDDL(params: any): Promise<{ output: string; artifacts: string[] }> {
    const layer = this.escapeIdentifier(params.layer || 'dwd');
    const tableName = this.escapeIdentifier(params.table_name || 'unknown');
    const columns = this.sanitizeColumns(params.columns || 'id STRING, event_time TIMESTAMP(3)');
    const partitionBy = this.escapeIdentifier(params.partition_by || 'days(event_time)');

    const artifactPath = path.join(process.cwd(), `${layer}_${tableName}_iceberg.sql`);
    const ddl = `CREATE TABLE IF NOT EXISTS iceberg.warehouse.${layer}_${tableName} (
${columns}
)
USING iceberg
PARTITIONED BY (${partitionBy})
OPTIONS (
    'format-version' = '2',
    'write.parquet.compression-codec' = 'snappy'
);`;

    await this.writer.writeFile(artifactPath, ddl);

    return {
      output: `Generated Iceberg DDL for ${layer}_${tableName}:\n\n${ddl}\n\nSaved to: ${artifactPath}`,
      artifacts: [artifactPath]
    };
  }

  private async generateClickHouseDDL(params: any): Promise<{ output: string; artifacts: string[] }> {
    const tableName = this.escapeIdentifier(params.table_name || 'unknown');
    const columns = this.sanitizeColumns(params.columns || 'id String, event_time DateTime');

    const artifactPath = path.join(process.cwd(), `${tableName}_ch.sql`);
    const ddl = `CREATE TABLE IF NOT EXISTS ${tableName} (
${columns}
) ENGINE = MergeTree()
ORDER BY tuple()
SETTINGS index_granularity = 8192;`;

    await this.writer.writeFile(artifactPath, ddl);

    return {
      output: `Generated ClickHouse DDL for ${tableName}:\n\n${ddl}\n\nSaved to: ${artifactPath}`,
      artifacts: [artifactPath]
    };
  }

  private async generateSparkSQL(params: any): Promise<{ output: string; artifacts: string[] }> {
    const tableName = this.escapeIdentifier(params.table_name || 'query');
    const source = this.escapeIdentifier(params.source || 'source_table');
    const artifactPath = path.join(process.cwd(), `spark_job_${tableName}.sql`);

    const sql = `-- Spark SQL for data processing
-- Source: ${source}
-- Target: ${tableName}

SELECT * FROM ${source} LIMIT 10;`;

    await this.writer.writeFile(artifactPath, sql);

    return {
      output: `Generated Spark SQL:\n\n${sql}\n\nSaved to: ${artifactPath}`,
      artifacts: [artifactPath]
    };
  }

  private async executeSparkSQL(params: any): Promise<{ output: string; artifacts?: string[] }> {
    const sql = this.sanitizeColumns(params.sql || '');
    if (!sql) return { output: 'No SQL provided for execution.' };

    const executor = this.getSparkExecutor();
    const result = await executor.execute(sql);

    if (!result.success) {
      return { output: `Spark execution failed:\n${result.error}` };
    }

    return {
      output: `Spark SQL executed successfully (${result.durationMs}ms):\n\n${result.data || 'Query completed (no result set)'}`,
      artifacts: []
    };
  }

  private async executeFlinkSQL(params: any): Promise<{ output: string; artifacts?: string[] }> {
    const sql = params.sql || '';
    const executor = this.getFlinkExecutor();
    const result = await executor.executeSQL(sql);

    return {
      output: `Flink job submitted:\nJob ID: ${result.jobId}\nStatus: ${result.status}\n${result.message}\n\nUse /flink status ${result.jobId} to monitor.`
    };
  }

  private async executeClickHouseQuery(params: any): Promise<{ output: string; artifacts?: string[] }> {
    const sql = this.sanitizeColumns(params.sql || '');
    if (!sql) return { output: 'No query provided for execution.' };

    const executor = this.getClickHouseExecutor();
    const result = await executor.query(sql);

    if (!result.success) {
      return { output: `ClickHouse query failed:\n${result.error}` };
    }

    return {
      output: `ClickHouse query result (${result.durationMs}ms):\n\n${result.data || 'Query completed'}`,
      artifacts: []
    };
  }

  private securityScan(params: any): { output: string } {
    const tableName = this.escapeIdentifier(params.tableName || params.table_name || 'unknown_table');

    const scanner = new SecurityScanner('');
    const mockColumns = [
      { name: 'user_id', type: 'STRING' },
      { name: 'phone_number', type: 'STRING' },
      { name: 'email', type: 'STRING' },
      { name: 'create_time', type: 'TIMESTAMP' }
    ];

    const result = scanner.scanTable(tableName, mockColumns);

    const fieldsList = result.fields.length > 0
      ? result.fields.map(f => `- ${f.name}: ${f.description} (${f.severity})`).join('\n')
      : '- No sensitive fields detected in mock schema';

    return {
      output: `Security scan for ${tableName}:\n\n${fieldsList}\n\nRecommendations:\n${result.recommendations.map(r => `- ${r}`).join('\n') || '- No actions needed'}\n\nNote: Provide actual table schema for a real scan.`
    };
  }

  private escapeIdentifier(id: string): string {
    return id.replace(/[^a-zA-Z0-9_]/g, '_');
  }

  private sanitizeColumns(columns: string): string {
    const sanitized = columns
      .replace(/;/g, '')
      .replace(/--/g, '')
      .replace(/\/\*/g, '')
      .replace(/\*\//g, '');
    return sanitized.split('\n').map(line => {
      const trimmed = line.trim();
      if (!trimmed || trimmed.startsWith('--')) return '';
      return `    ${trimmed}`;
    }).filter(Boolean).join(',\n');
  }

  private getSparkExecutor(): SparkExecutor {
    if (!this.sparkExecutor) {
      this.sparkExecutor = new SparkExecutor();
    }
    return this.sparkExecutor;
  }

  private getFlinkExecutor(): FlinkExecutor {
    if (!this.flinkExecutor) {
      this.flinkExecutor = new FlinkExecutor();
    }
    return this.flinkExecutor;
  }

  private getClickHouseExecutor(): ClickHouseExecutor {
    if (!this.clickHouseExecutor) {
      this.clickHouseExecutor = new ClickHouseExecutor();
    }
    return this.clickHouseExecutor;
  }
}
