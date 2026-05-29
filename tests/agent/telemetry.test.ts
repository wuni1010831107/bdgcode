import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { TelemetryCollector } from '../../src/agent/telemetry';
import { rmSync, mkdirSync } from 'fs';
import * as os from 'os';
import * as path from 'path';

describe('TelemetryCollector', () => {
  const testDir = path.join(os.tmpdir(), 'datadev-telemetry-test');

  beforeEach(() => {
    rmSync(testDir, { recursive: true, force: true });
    mkdirSync(testDir, { recursive: true });
  });

  afterEach(() => {
    rmSync(testDir, { recursive: true, force: true });
  });

  it('should record tool calls', () => {
    const collector = new TelemetryCollector(testDir);
    const sessionId = collector.startSession();

    collector.recordToolCall({
      toolName: 'sql-generator',
      params: { action: 'generate-iceberg-ddl' },
      resultStatus: 'success',
      executionTimeMs: 150
    });

    collector.endSession();

    const stats = collector.getStats();
    expect(stats.totalToolCalls).toBe(1);
    expect(stats.totalSessions).toBe(1);
  });

  it('should record task outcomes', () => {
    const collector = new TelemetryCollector(testDir);
    collector.startSession();

    collector.recordTaskOutcome({
      taskType: 'iceberg-create',
      stepsPlanned: 3,
      stepsCompleted: 3,
      roundsToCompletion: 1,
      userCorrections: 0,
      accepted: true
    });

    collector.endSession();
    const stats = collector.getStats();
    expect(stats.totalTasks).toBe(1);
  });

  it('should handle multiple sessions', () => {
    const collector = new TelemetryCollector(testDir);
    collector.startSession();
    collector.recordToolCall({
      toolName: 'tool-a',
      params: {},
      resultStatus: 'success',
      executionTimeMs: 100
    });
    collector.endSession();

    collector.startSession();
    collector.recordToolCall({
      toolName: 'tool-b',
      params: {},
      resultStatus: 'error',
      executionTimeMs: 50,
      errorType: 'timeout'
    });
    collector.endSession();

    const stats = collector.getStats();
    expect(stats.totalSessions).toBe(2);
    expect(stats.totalToolCalls).toBe(2);
  });

  it('should not record when no session active', () => {
    const collector = new TelemetryCollector(testDir);
    collector.recordToolCall({
      toolName: 'tool-a',
      params: {},
      resultStatus: 'success',
      executionTimeMs: 100
    });

    const stats = collector.getStats();
    expect(stats.totalToolCalls).toBe(0);
  });
});
