import { spawn, ChildProcess } from 'child_process';

export interface ProcessResult {
  exitCode: number | null;
  stdout: string;
  stderr: string;
  timedOut: boolean;
}

export interface ProcessOptions {
  timeout?: number;
  cwd?: string;
  env?: Record<string, string>;
}

export class ProcessManager {
  private processes: ChildProcess[] = [];

  async execute(
    command: string,
    args: string[] = [],
    options: ProcessOptions = {}
  ): Promise<ProcessResult> {
    const { timeout: timeoutMs = 30000, cwd, env } = options;

    return new Promise((resolve) => {
      const proc = spawn(command, args, { cwd, env: { ...process.env, ...env } });
      this.processes.push(proc);

      let stdout = '';
      let stderr = '';
      let settled = false;
      let timeoutId: NodeJS.Timeout | null = null;

      const finish = (exitCode: number | null, timedOut: boolean = false) => {
        if (settled) return;
        settled = true;
        if (timeoutId) clearTimeout(timeoutId);
        this.processes = this.processes.filter(p => p !== proc);
        resolve({ exitCode, stdout, stderr, timedOut });
      };

      proc.stdout.on('data', (data: Buffer) => { stdout += data.toString(); });
      proc.stderr.on('data', (data: Buffer) => { stderr += data.toString(); });

      proc.on('close', (code) => finish(code ?? -1));
      proc.on('error', () => finish(-1));

      if (timeoutMs > 0) {
        timeoutId = setTimeout(() => {
          proc.kill('SIGKILL');
          finish(-1, true);
        }, timeoutMs);
      }
    });
  }

  killAll(): void {
    for (const proc of this.processes) {
      try { proc.kill('SIGKILL'); } catch {}
    }
    this.processes = [];
  }

  async cleanup(): Promise<void> {
    this.killAll();
    await new Promise(r => setTimeout(r, 100));
  }
}
