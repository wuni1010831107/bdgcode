import { describe, it, expect, vi } from 'vitest';
import { Executor } from '../../src/agent/executor';
import { Planner } from '../../src/agent/planner';
import { Memory } from '../../src/agent/memory';

describe('Executor', () => {
  const createMockPlanner = (planResult: any) => ({
    plan: vi.fn().mockResolvedValue(planResult)
  });

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
