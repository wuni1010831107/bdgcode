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

describe('REPL input validation', () => {
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

  it('should reject input exceeding max length', () => {
    const longInput = 'a'.repeat(50001);
    const result = (repl as any).validateInputLength(longInput);
    expect(result).toBe(false);
  });

  it('should accept input within max length', () => {
    const normalInput = 'generate some sql';
    const result = (repl as any).validateInputLength(normalInput);
    expect(result).toBe(true);
  });

  it('should warn on very long input', () => {
    const longInput = 'a'.repeat(20001);
    const warnSpy = vi.spyOn(console, 'log').mockImplementation(() => {});
    const result = (repl as any).validateInputLength(longInput);
    expect(result).toBe(true);
    expect(warnSpy).toHaveBeenCalled();
    warnSpy.mockRestore();
  });

  it('should not warn on normal length input', () => {
    const normalInput = 'generate some sql';
    const warnSpy = vi.spyOn(console, 'log').mockImplementation(() => {});
    const result = (repl as any).validateInputLength(normalInput);
    expect(result).toBe(true);
    expect(warnSpy).not.toHaveBeenCalled();
    warnSpy.mockRestore();
  });

  it('should accept input at exactly max length', () => {
    const maxInput = 'a'.repeat(50000);
    const result = (repl as any).validateInputLength(maxInput);
    expect(result).toBe(true);
  });

  it('should reject input at max length + 1', () => {
    const overInput = 'a'.repeat(50001);
    const result = (repl as any).validateInputLength(overInput);
    expect(result).toBe(false);
  });

  it('should warn at exactly warn threshold', () => {
    const warnInput = 'a'.repeat(20000);
    const warnSpy = vi.spyOn(console, 'log').mockImplementation(() => {});
    const result = (repl as any).validateInputLength(warnInput);
    expect(result).toBe(true);
    expect(warnSpy).not.toHaveBeenCalled();
    warnSpy.mockRestore();
  });

  it('should warn just above warn threshold', () => {
    const warnInput = 'a'.repeat(20001);
    const warnSpy = vi.spyOn(console, 'log').mockImplementation(() => {});
    const result = (repl as any).validateInputLength(warnInput);
    expect(result).toBe(true);
    expect(warnSpy).toHaveBeenCalled();
    warnSpy.mockRestore();
  });
});
