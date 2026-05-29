import { ProcessManager } from './process-manager';
import { ResultFormatter } from './result-formatter';
import * as fs from 'fs';
import * as os from 'os';
import * as path from 'path';

export interface FlinkConfig {
  flinkBinPath?: string;
  timeout?: number;
  clusterManager?: 'local' | 'yarn' | 'kubernetes';
}

export interface FlinkJobResult {
  jobId: string;
  status: 'submitted' | 'running' | 'completed' | 'failed' | 'cancelled' | 'unknown';
  message: string;
}

export class FlinkExecutor {
  private pm: ProcessManager;
  private formatter: ResultFormatter;
  private config: Required<FlinkConfig>;

  constructor(config: FlinkConfig = {}) {
    this.pm = new ProcessManager();
    this.formatter = new ResultFormatter();
    this.config = {
      flinkBinPath: config.flinkBinPath || 'flink',
      timeout: config.timeout || 120000,
      clusterManager: config.clusterManager || 'local'
    };
  }

  async executeSQL(sql: string): Promise<FlinkJobResult> {
    const tmpFile = path.join(os.tmpdir(), `flink_sql_${Date.now()}_${process.pid}.sql`);
    try {
      fs.writeFileSync(tmpFile, sql);
      return await this.executeSQLFile(tmpFile);
    } finally {
      try { fs.unlinkSync(tmpFile); } catch {}
    }
  }

  async executeSQLFile(sqlPath: string): Promise<FlinkJobResult> {
    try {
      const result = await this.pm.execute(
        `${this.config.flinkBinPath} run`,
        [
          '-t', this.config.clusterManager,
          '-c', 'org.apache.flink.table.gateway.service.DefaultSessionService',
          `file://${sqlPath}`
        ],
        { timeout: this.config.timeout }
      );

      const jobId = this.extractJobId(result.stdout) || `job_${Date.now()}`;
      const status = result.exitCode === 0 ? 'submitted' : 'failed';

      return {
        jobId,
        status,
        message: result.exitCode === 0
          ? this.formatter.formatFlinkSubmission(result.stdout)
          : this.formatter.formatError(result.stderr, result.exitCode ?? -1)
      };
    } catch (error) {
      return {
        jobId: `job_${Date.now()}`,
        status: 'failed',
        message: error instanceof Error ? error.message : String(error)
      };
    }
  }

  async executeJAR(jarPath: string, args: string[] = []): Promise<FlinkJobResult> {
    try {
      const result = await this.pm.execute(
        `${this.config.flinkBinPath} run`,
        [
          '-t', this.config.clusterManager,
          jarPath,
          ...args
        ],
        { timeout: this.config.timeout }
      );

      const jobId = this.extractJobId(result.stdout) || `job_${Date.now()}`;
      return {
        jobId,
        status: result.exitCode === 0 ? 'submitted' : 'failed',
        message: result.exitCode === 0
          ? `JAR job submitted: ${jarPath}`
          : this.formatter.formatError(result.stderr, result.exitCode ?? -1)
      };
    } catch (error) {
      return {
        jobId: `job_${Date.now()}`,
        status: 'failed',
        message: error instanceof Error ? error.message : String(error)
      };
    }
  }

  async getJobStatus(jobId: string): Promise<FlinkJobResult['status']> {
    try {
      const result = await this.pm.execute(
        `${this.config.flinkBinPath} list`,
        ['-t', this.config.clusterManager, '-r']
      );

      if (result.stdout.includes(jobId)) {
        if (result.stdout.includes('RUNNING')) return 'running';
        if (result.stdout.includes('FINISHED')) return 'completed';
        if (result.stdout.includes('FAILED')) return 'failed';
        if (result.stdout.includes('CANCELLING') || result.stdout.includes('CANCELED')) return 'cancelled';
      }
      return 'unknown';
    } catch {
      return 'unknown';
    }
  }

  async listJobs(): Promise<Array<{ jobId: string; status: string; name: string }>> {
    try {
      const result = await this.pm.execute(
        `${this.config.flinkBinPath} list`,
        ['-t', this.config.clusterManager, '-r']
      );

      if (result.exitCode !== 0) return [];

      return result.stdout.split('\n')
        .filter(l => l.trim() && !l.includes('===') && !l.includes('Waiting') && !l.includes('No'))
        .map(l => {
          const parts = l.trim().split(/\s+/);
          return {
            jobId: parts[0] || 'unknown',
            status: parts[1] || 'unknown',
            name: parts.slice(2).join(' ') || ''
          };
        });
    } catch {
      return [];
    }
  }

  async cancelJob(jobId: string): Promise<{ success: boolean; message: string }> {
    try {
      const result = await this.pm.execute(
        `${this.config.flinkBinPath} cancel`,
        ['-t', this.config.clusterManager, jobId]
      );
      return {
        success: result.exitCode === 0,
        message: result.exitCode === 0
          ? `Job ${jobId} cancelled`
          : this.formatter.formatError(result.stderr, result.exitCode ?? -1)
      };
    } catch (error) {
      return {
        success: false,
        message: error instanceof Error ? error.message : String(error)
      };
    }
  }

  async stop(): Promise<void> {
    await this.pm.cleanup();
  }

  private extractJobId(output: string): string | null {
    const match = output.match(/(?:Job ID[:\s]+|with job ID\s+)([a-f0-9-]+)/i);
    return match ? match[1] : null;
  }
}
