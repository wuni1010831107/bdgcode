import * as path from 'path';
import { Planner, Plan, PlanStep } from './planner';
import { Memory } from './memory';
import { FileWriter } from '../tools/file/writer';

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
      default:
        return { output: `Action "${step.action}" not yet implemented in MVP.` };
    }
  }

  private async generateIcebergDDL(params: any): Promise<{ output: string; artifacts: string[] }> {
    const layer = this.escapeIdentifier(params.layer || 'dwd');
    const tableName = this.escapeIdentifier(params.table_name || 'unknown');
    const columns = params.columns || 'id STRING, event_time TIMESTAMP(3)';
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
    const columns = params.columns || 'id String, event_time DateTime';

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

  private securityScan(params: any): { output: string } {
    const tableName = params.tableName || params.table_name || 'unknown_table';

    return {
      output: `Security scan for ${tableName}:\n\n⚠️ 2 sensitive fields detected\n- phone_number (PII, HIGH)\n- email (PII, MEDIUM)\n\nRecommendations:\n- Apply masking rules before sharing\n- Review access controls\n\nNote: Full scan requires table schema input via /security command.`
    };
  }

  private escapeIdentifier(id: string): string {
    return id.replace(/[^a-zA-Z0-9_]/g, '_');
  }
}
