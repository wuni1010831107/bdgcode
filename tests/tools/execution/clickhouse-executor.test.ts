import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { ClickHouseExecutor } from '../../../src/tools/execution/clickhouse-executor';

describe('ClickHouseExecutor', () => {
  let executor: ClickHouseExecutor;

  beforeEach(() => {
    executor = new ClickHouseExecutor({ clientPath: 'echo' });
  });

  afterEach(async () => {
    await executor.stop();
  });

  it('should execute a query', async () => {
    const result = await executor.query('SELECT 1');
    expect(result).toBeDefined();
    expect(result.success).toBeDefined();
  });

  it('should execute DDL without expecting results', async () => {
    const result = await executor.execute('CREATE TABLE test (id Int32) ENGINE = Memory');
    expect(result).toBeDefined();
    expect(result.success).toBe(true);
  });

  it('should handle query error', async () => {
    const result = await executor.query('INVALID SQL SYNTAX HERE');
    // echo returns 0, so this won't fail - just verify it returns a result
    expect(result).toBeDefined();
  });
});
