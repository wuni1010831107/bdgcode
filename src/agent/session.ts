import * as fs from 'fs';
import * as path from 'path';
import * as os from 'os';

export interface Session {
  id: string;
  startTime: Date;
  messages: { role: 'user' | 'assistant'; content: string; timestamp: Date }[];
  metadata: Record<string, any>;
}

export class SessionManager {
  private sessionsDir: string;
  private currentSession: Session | null = null;

  constructor(sessionsDir?: string) {
    this.sessionsDir = sessionsDir || path.join(os.homedir(), '.datadev-agent', 'sessions');
    fs.mkdirSync(this.sessionsDir, { recursive: true });
  }

  createSession(): Session {
    this.currentSession = {
      id: this.generateId(),
      startTime: new Date(),
      messages: [],
      metadata: {}
    };
    return this.currentSession;
  }

  addMessage(role: 'user' | 'assistant', content: string): void {
    if (!this.currentSession) {
      this.createSession();
    }
    this.currentSession!.messages.push({ role, content, timestamp: new Date() });
  }

  getCurrentSession(): Session | null {
    return this.currentSession;
  }

  saveSession(): void {
    if (!this.currentSession) return;
    const filePath = path.join(this.sessionsDir, `${this.currentSession.id}.json`);
    fs.writeFileSync(filePath, JSON.stringify(this.currentSession, null, 2));
  }

  listSessions(): { id: string; startTime: string; messageCount: number }[] {
    const files = fs.readdirSync(this.sessionsDir).filter(f => f.endsWith('.json'));
    return files.map(f => {
      const data = JSON.parse(fs.readFileSync(path.join(this.sessionsDir, f), 'utf-8'));
      return {
        id: data.id,
        startTime: data.startTime,
        messageCount: data.messages.length
      };
    });
  }

  private generateId(): string {
    return `session_${Date.now()}_${Math.random().toString(36).slice(2, 9)}`;
  }
}
