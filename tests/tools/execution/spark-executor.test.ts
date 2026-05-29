import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { SparkExecutor } from '../../../src/tools/execution/spark-executor';

describe('SparkExecutor', () => {
  let executor: SparkExecutor;

  beforeEach(() => {
    executor = new SparkExecutor({ sparkSqlPath: 'echo' });
  });

  afterEach(async () => {
    await executor.stop();
  });

  it('should execute SQL and return results', async () => {
    const result = await executor.execute('SELECT 1 AS col');
    expect(result.success).toBe(true);
    expect(result.durationMs).toBeGreaterThan(0);
  });

  it('should execute SQL from file', async () => {
    const result = await executor.executeFile('/tmp/nonexistent_spark_file.sql');
    expect(result.success).toBe(false);
    expect(result.error).toContain('File not found');
  });

  it('should stop running query', async () => {
    const promise = executor.execute('SELECT 1');
    await executor.stop();
    const result = await promise;
    expect(result.success).toBe(false);
  });
});
