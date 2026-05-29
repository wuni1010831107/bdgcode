import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import chalk from 'chalk';
import { REPL } from '../../src/cli/repl';
import { SessionManager } from '../../src/agent/session';
import { Memory } from '../../src/agent/memory';

describe('REPL', () => {
  let repl: REPL;
  let sessionManager: SessionManager;

  beforeEach(() => {
    vi.spyOn(console, 'log').mockImplementation(() => {});
    vi.spyOn(console, 'error').mockImplementation(() => {});

    sessionManager = new SessionManager();
    const memory = new Memory('knowledge', '/tmp/test');

    repl = new REPL({
      sessionManager,
      memory,
      config: {
        llm: { provider: 'anthropic' as const, apiKey: '', model: 'claude-sonnet-4-6' },
        telemetry: { enabled: false, storagePath: '' },
        sources: [],
        security: { sensitivePatternsPath: '', maskingEnabled: false, auditLogPath: '' },
        knowledgePath: 'knowledge'
      }
    });
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('should have REPL class defined', () => {
    expect(REPL).toBeDefined();
  });

  it('should create instance with context', () => {
    expect(repl).toBeInstanceOf(REPL);
  });
});
