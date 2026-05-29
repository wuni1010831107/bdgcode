import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { ProcessManager } from '../../../src/tools/execution/process-manager';

describe('ProcessManager', () => {
  let pm: ProcessManager;

  beforeEach(() => {
    pm = new ProcessManager();
  });

  afterEach(async () => {
    await pm.cleanup();
  });

  it('should spawn a process and capture stdout', async () => {
    const result = await pm.execute('echo', ['hello world'], { timeout: 5000 });
    expect(result.exitCode).toBe(0);
    expect(result.stdout.trim()).toBe('hello world');
    expect(result.stderr).toBe('');
  }, 10000);

  it('should return non-zero exit code on failure', async () => {
    const result = await pm.execute('false', [], { timeout: 5000 });
    expect(result.exitCode).not.toBe(0);
  }, 10000);

  it('should kill process on timeout', async () => {
    const result = await pm.execute('sleep', ['10'], { timeout: 1000 });
    expect(result.exitCode).not.toBe(0);
    expect(result.timedOut).toBe(true);
  }, 15000);

  it('should handle process with stderr output', async () => {
    const result = await pm.execute('node', ['-e', 'console.error("err msg")'], { timeout: 5000 });
    expect(result.exitCode).toBe(0);
    expect(result.stderr).toContain('err msg');
  }, 10000);

  it('should kill running process on demand', async () => {
    const promise = pm.execute('sleep', ['10'], { timeout: 30000 });
    await new Promise(r => setTimeout(r, 200));
    pm.killAll();
    const result = await promise;
    expect(result.exitCode).not.toBe(0);
  }, 15000);
});
