import * as fs from 'fs';
import * as path from 'path';
import * as os from 'os';

export interface ToolCallRecord {
  sessionId: string;
  callId: string;
  timestamp: string;
  toolName: string;
  params: Record<string, any>;
  resultStatus: 'success' | 'error';
  executionTimeMs: number;
  errorType?: string;
}

export interface TaskOutcomeRecord {
  sessionId: string;
  taskId: string;
  taskType: string;
  stepsPlanned: number;
  stepsCompleted: number;
  roundsToCompletion: number;
  userCorrections: number;
  accepted: boolean;
}

export interface SessionRecord {
  sessionId: string;
  startTime: string;
  endTime: string;
  queryCount: number;
  taskTypes: string[];
  totalTokens: number;
  userCorrections: number;
}

export interface SessionEndRecord {
  sessionId: string;
  endTime: string;
}

export class TelemetryCollector {
  private telemetryDir: string;
  private currentSessionId: string | null = null;

  constructor(telemetryDir?: string) {
    this.telemetryDir = telemetryDir || path.join(os.homedir(), '.datadev-agent', 'telemetry');
    try {
      fs.mkdirSync(this.telemetryDir, { recursive: true });
    } catch (err) {
      console.error(`Warning: cannot create telemetry directory ${this.telemetryDir}: ${err}`);
    }
  }

  startSession(): string {
    if (this.currentSessionId) {
      return this.currentSessionId;
    }

    this.currentSessionId = `session_${Date.now()}`;
    const record: SessionRecord = {
      sessionId: this.currentSessionId,
      startTime: new Date().toISOString(),
      endTime: '',
      queryCount: 0,
      taskTypes: [],
      totalTokens: 0,
      userCorrections: 0
    };
    this.append('sessions.jsonl', record);
    return this.currentSessionId;
  }

  endSession(): void {
    if (!this.currentSessionId) return;

    const endRecord: SessionEndRecord = {
      sessionId: this.currentSessionId,
      endTime: new Date().toISOString()
    };
    this.append('session-ends.jsonl', endRecord);
    this.currentSessionId = null;
  }

  recordToolCall(record: Omit<ToolCallRecord, 'sessionId' | 'callId' | 'timestamp'>): void {
    if (!this.currentSessionId) return;

    const fullRecord: ToolCallRecord = {
      ...record,
      sessionId: this.currentSessionId,
      callId: `call_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`,
      timestamp: new Date().toISOString()
    };

    this.append('tool-calls.jsonl', fullRecord);
  }

  recordTaskOutcome(record: Omit<TaskOutcomeRecord, 'sessionId' | 'taskId'>): void {
    if (!this.currentSessionId) return;

    const fullRecord: TaskOutcomeRecord = {
      ...record,
      sessionId: this.currentSessionId,
      taskId: `task_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`
    };

    this.append('task-outcomes.jsonl', fullRecord);
  }

  getStats(): { totalSessions: number; totalTasks: number; totalToolCalls: number } {
    return {
      totalSessions: this.countLines('sessions.jsonl'),
      totalTasks: this.countLines('task-outcomes.jsonl'),
      totalToolCalls: this.countLines('tool-calls.jsonl')
    };
  }

  private append(filename: string, record: any): void {
    try {
      const filePath = path.join(this.telemetryDir, filename);
      fs.appendFileSync(filePath, JSON.stringify(record) + '\n');
    } catch (err) {
      console.error(`Warning: telemetry write failed: ${err}`);
    }
  }

  private countLines(filename: string): number {
    const filePath = path.join(this.telemetryDir, filename);
    if (!fs.existsSync(filePath)) return 0;
    try {
      return fs.readFileSync(filePath, 'utf-8').split('\n').filter(l => l.trim()).length;
    } catch {
      return 0;
    }
  }
}
