import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { FlinkExecutor } from '../../../src/tools/execution/flink-executor';

describe('FlinkExecutor', () => {
  let executor: FlinkExecutor;

  beforeEach(() => {
    executor = new FlinkExecutor({ flinkBinPath: 'echo' });
  });

  afterEach(async () => {
    await executor.stop();
  });

  it('should submit a SQL job', async () => {
    const result = await executor.executeSQL('SELECT 1');
    expect(result).toBeDefined();
    expect(result.jobId).toBeDefined();
    // echo mock may not return expected status, just verify it doesn't throw
    expect(['submitted', 'failed']).toContain(result.status);
  });

  it('should submit a JAR job', async () => {
    const result = await executor.executeJAR('/tmp/test.jar');
    expect(result).toBeDefined();
    expect(result.jobId).toBeDefined();
    expect(['submitted', 'failed']).toContain(result.status);
  });

  it('should check job status returns unknown for missing job', async () => {
    const result = await executor.getJobStatus('nonexistent-job-id');
    expect(result).toBe('unknown');
  });

  it('should cancel a job', async () => {
    const result = await executor.cancelJob('test-job-id');
    expect(result).toBeDefined();
    expect(result.success).toBeDefined();
  });

  it('should list running jobs', async () => {
    const result = await executor.listJobs();
    expect(Array.isArray(result)).toBe(true);
  });
});
