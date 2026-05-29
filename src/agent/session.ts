import * as fs from 'fs';
import * as path from 'path';
import * as os from 'os';

export interface Session {
  id: string;
  startTime: Date;
  messages: { role: 'user' | 'assistant' | 'system'; content: string; timestamp: Date }[];
  metadata: Record<string, any>;
}

export class SessionManager {
  private sessionsDir: string;
  private currentSession: Session | null = null;

  constructor(sessionsDir?: string) {
    this.sessionsDir = sessionsDir || path.join(os.homedir(), '.datadev-agent', 'sessions');
    try {
      fs.mkdirSync(this.sessionsDir, { recursive: true });
    } catch (err) {
      console.error(`Warning: cannot create sessions directory ${this.sessionsDir}: ${err}`);
    }
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
    try {
      const filePath = path.join(this.sessionsDir, `${this.currentSession.id}.json`);
      fs.writeFileSync(filePath, JSON.stringify(this.currentSession, null, 2));
    } catch (err) {
      console.error(`Warning: cannot save session: ${err}`);
    }
  }

  listSessions(): { id: string; startTime: string; messageCount: number }[] {
    try {
      const files = fs.readdirSync(this.sessionsDir).filter(f => f.endsWith('.json'));
      return files.map(f => {
        const filePath = path.join(this.sessionsDir, f);
        const raw = fs.readFileSync(filePath, 'utf-8');
        const data = JSON.parse(raw);
        return {
          id: data.id,
          startTime: data.startTime,
          messageCount: data.messages?.length ?? 0
        };
      });
    } catch (err) {
      console.error(`Warning: cannot list sessions: ${err}`);
      return [];
    }
  }

  private generateId(): string {
    return `session_${Date.now()}_${Math.random().toString(36).slice(2, 9)}`;
  }
}
