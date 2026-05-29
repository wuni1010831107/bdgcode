import { describe, it, expect } from 'vitest';
import { ResultFormatter } from '../../../src/tools/execution/result-formatter';

describe('ResultFormatter', () => {
  const fmt = new ResultFormatter();

  it('should format tab-separated output as table', () => {
    const raw = 'name\tage\nAlice\t30\nBob\t25';
    const result = fmt.formatTable(raw);
    expect(result).toContain('Alice');
    expect(result).toContain('30');
    expect(result).toContain('Bob');
  });

  it('should format single row result', () => {
    const raw = 'count\n42';
    const result = fmt.formatTable(raw);
    expect(result).toContain('42');
  });

  it('should handle empty output', () => {
    const result = fmt.formatTable('');
    expect(result).toContain('No results');
  });

  it('should format Spark SQL explain output', () => {
    const raw = '== Physical Plan ==\n*(1) Scan iceberg.warehouse.dwd_user_behavior';
    const result = fmt.formatSparkExplain(raw);
    expect(result).toContain('Physical Plan');
  });

  it('should format Flink job submission response', () => {
    const raw = 'Job has been submitted with job ID abc123-456';
    const result = fmt.formatFlinkSubmission(raw);
    expect(result).toContain('abc123-456');
  });
});
