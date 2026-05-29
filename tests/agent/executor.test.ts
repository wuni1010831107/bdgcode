import { describe, it, expect, vi } from 'vitest';
import { Executor } from '../../src/agent/executor';
import { Planner } from '../../src/agent/planner';
import { Memory } from '../../src/agent/memory';

const createMockPlanner = (planResult: any) => ({
  plan: vi.fn().mockResolvedValue(planResult)
});

describe('Executor', () => {

  it('should execute iceberg-create plan', async () => {
    const memory = new Memory('knowledge', '/tmp/test');
    const planner = createMockPlanner({
      intent: 'iceberg-create',
      confidence: 0.9,
      steps: [
        { step: 1, action: 'generate-iceberg-ddl', description: 'Create table', params: { layer: 'dwd', table_name: 'user_behavior' } }
      ],
      requiresConfirmation: true
    });

    const executor = new Executor(planner as any, memory);
    const result = await executor.execute('Create Iceberg table for user events');

    expect(result.success).toBe(true);
    expect(result.output).toContain('Iceberg DDL');
    expect(result.output).toContain('dwd_user_behavior');
  });

  it('should handle low confidence', async () => {
    const memory = new Memory('knowledge', '/tmp/test');
    const planner = createMockPlanner({
      intent: 'unknown',
      confidence: 0.1,
      steps: [],
      requiresConfirmation: false
    });

    const executor = new Executor(planner as any, memory);
    const result = await executor.execute('xyz abc');

    expect(result.success).toBe(false);
    expect(result.output).toContain('not sure');
  });

  it('should handle security-scan action', async () => {
    const memory = new Memory('knowledge', '/tmp/test');
    const planner = createMockPlanner({
      intent: 'security-scan',
      confidence: 0.9,
      steps: [
        { step: 1, action: 'security-scan', description: 'Scan table', params: { tableName: 'users' } }
      ],
      requiresConfirmation: true
    });

    const executor = new Executor(planner as any, memory);
    const result = await executor.execute('/scan users');

    expect(result.success).toBe(true);
    expect(result.output).toContain('Security scan');
    expect(result.output).toContain('sensitive');
  });

  it('should handle execute-spark-sql action', async () => {
    const memory = new Memory('knowledge', '/tmp/test');
    const planner = createMockPlanner({
      intent: 'run-spark-sql',
      confidence: 0.9,
      steps: [
        {
          step: 1,
          action: 'execute-spark-sql',
          description: 'Run Spark SQL query',
          params: { sql: 'SELECT count(*) FROM dwd_user_behavior' }
        }
      ],
      requiresConfirmation: true
    });

    const executor = new Executor(planner as any, memory);
    const result = await executor.execute('Run Spark SQL to count users');

    // Should handle the action (may fail due to missing spark-sql binary, but should not throw)
    expect(result).toBeDefined();
    expect(result.output).toBeDefined();
  });

  it('should handle execute-clickhouse-query action', async () => {
    const memory = new Memory('knowledge', '/tmp/test');
    const planner = createMockPlanner({
      intent: 'clickhouse-query',
      confidence: 0.9,
      steps: [
        {
          step: 1,
          action: 'execute-clickhouse-query',
          description: 'Query ClickHouse',
          params: { sql: 'SELECT count(*) FROM user_events' }
        }
      ],
      requiresConfirmation: true
    });

    const executor = new Executor(planner as any, memory);
    const result = await executor.execute('Query ClickHouse for event count');

    // Should handle the action (may fail due to missing clickhouse-client binary)
    expect(result).toBeDefined();
    expect(result.output).toBeDefined();
  });

  it('should handle execute-flink-sql action', async () => {
    const memory = new Memory('knowledge', '/tmp/test');
    const planner = createMockPlanner({
      intent: 'flink-sql',
      confidence: 0.9,
      steps: [
        {
          step: 1,
          action: 'execute-flink-sql',
          description: 'Submit Flink SQL job',
          params: { sql: 'SELECT * FROM kafka_source' }
        }
      ],
      requiresConfirmation: true
    });

    const executor = new Executor(planner as any, memory);
    const result = await executor.execute('Submit Flink job');

    // Should handle the action (may fail due to missing flink binary)
    expect(result).toBeDefined();
    expect(result.output).toBeDefined();
    expect(result.output).toContain('Flink');
  });
});

describe('Executor CDC and real-time actions', () => {
  it('should handle generate-cdc-mysql-iceberg action', async () => {
    const memory = new Memory('knowledge', '/tmp/test');
    const planner = createMockPlanner({
      intent: 'cdc-sync',
      confidence: 0.9,
      steps: [{
        step: 1,
        action: 'generate-cdc-mysql-iceberg',
        description: 'Generate CDC MySQL → Iceberg',
        params: {
          mysql_host: 'localhost', mysql_port: '3306',
          mysql_user: 'root', mysql_password: 'pass',
          mysql_database: 'order_db', source_table: 'orders',
          iceberg_catalog: 'file:///tmp/warehouse', warehouse: 'file:///tmp/warehouse',
          target_table: 'dwd_orders', primary_key: 'id',
          columns: 'id STRING, name STRING, event_time TIMESTAMP(3)'
        }
      }],
      requiresConfirmation: true
    });
    const executor = new Executor(planner as any, memory);
    const result = await executor.execute('CDC sync MySQL orders to Iceberg');
    expect(result.success).toBe(true);
    expect(result.output).toContain('Flink CDC');
    expect(result.output).toContain('mysql-cdc');
  });

  it('should handle generate-cdc-postgres-iceberg action', async () => {
    const memory = new Memory('knowledge', '/tmp/test');
    const planner = createMockPlanner({
      intent: 'cdc-postgres',
      confidence: 0.9,
      steps: [{
        step: 1,
        action: 'generate-cdc-postgres-iceberg',
        description: 'Generate CDC PostgreSQL → Iceberg',
        params: {
          pg_host: 'localhost', pg_port: '5432',
          pg_user: 'postgres', pg_password: 'pass',
          pg_database: 'public', source_table: 'users',
          iceberg_catalog: 'file:///tmp/warehouse', warehouse: 'file:///tmp/warehouse',
          target_table: 'dwd_users', primary_key: 'id',
          columns: 'id INT, name STRING'
        }
      }],
      requiresConfirmation: true
    });
    const executor = new Executor(planner as any, memory);
    const result = await executor.execute('CDC sync PostgreSQL users to Iceberg');
    expect(result.success).toBe(true);
    expect(result.output).toContain('postgres-cdc');
  });

  it('should handle generate-realtime-etl dedup action', async () => {
    const memory = new Memory('knowledge', '/tmp/test');
    const planner = createMockPlanner({
      intent: 'realtime-etl',
      confidence: 0.9,
      steps: [{
        step: 1,
        action: 'generate-realtime-etl',
        description: 'Generate real-time dedup ETL',
        params: {
          etl_type: 'dedup',
          source_table: 'kafka_source',
          target_table: 'dwd_dedup',
          key_column: 'id',
          time_column: 'event_time',
          warehouse: 'file:///tmp/warehouse'
        }
      }],
      requiresConfirmation: true
    });
    const executor = new Executor(planner as any, memory);
    const result = await executor.execute('Deduplicate real-time events');
    expect(result.success).toBe(true);
    expect(result.output).toContain('ROW_NUMBER');
  });

  it('should handle generate-realtime-etl window-aggregation action', async () => {
    const memory = new Memory('knowledge', '/tmp/test');
    const planner = createMockPlanner({
      intent: 'realtime-etl',
      confidence: 0.9,
      steps: [{
        step: 1,
        action: 'generate-realtime-etl',
        description: 'Generate window aggregation',
        params: {
          etl_type: 'window-aggregation',
          source_table: 'kafka_events',
          target_table: 'dws_minute_stats',
          group_by_columns: 'category',
          time_column: 'event_time',
          window_size: '1 MINUTE',
          value_column: 'amount',
          warehouse: 'file:///tmp/warehouse'
        }
      }],
      requiresConfirmation: true
    });
    const executor = new Executor(planner as any, memory);
    const result = await executor.execute('Generate minute-level aggregation');
    expect(result.success).toBe(true);
    expect(result.output).toContain('TUMBLE');
  });

  it('should handle generate-consistency-check action', async () => {
    const memory = new Memory('knowledge', '/tmp/test');
    const planner = createMockPlanner({
      intent: 'consistency-check',
      confidence: 0.9,
      steps: [{
        step: 1,
        action: 'generate-consistency-check',
        description: 'Generate consistency check SQL',
        params: {
          source_table: 'mysql_orders',
          target_table: 'iceberg_orders',
          key_column: 'order_id',
          time_column: 'update_time'
        }
      }],
      requiresConfirmation: true
    });
    const executor = new Executor(planner as any, memory);
    const result = await executor.execute('Check CDC sync consistency');
    expect(result.success).toBe(true);
    expect(result.output).toContain('source');
    expect(result.output).toContain('target');
  });

  it('should handle generate-kafka-source action', async () => {
    const memory = new Memory('knowledge', '/tmp/test');
    const planner = createMockPlanner({
      intent: 'kafka-ingest',
      confidence: 0.9,
      steps: [{
        step: 1,
        action: 'generate-kafka-source',
        description: 'Generate Kafka source',
        params: {
          topic: 'user_events',
          bootstrap_servers: 'kafka:9092',
          target_table: 'kafka_user_events',
          columns: 'user_id STRING, event_type STRING, event_time TIMESTAMP(3)',
          key_column: 'user_id'
        }
      }],
      requiresConfirmation: true
    });
    const executor = new Executor(planner as any, memory);
    const result = await executor.execute('Create Kafka source for user events');
    expect(result.success).toBe(true);
    expect(result.output).toContain('kafka');
  });
});
