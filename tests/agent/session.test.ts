import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { SessionManager } from '../../src/agent/session';
import { rmSync, mkdirSync } from 'fs';
import * as os from 'os';
import * as path from 'path';

describe('SessionManager', () => {
  const testDir = path.join(os.tmpdir(), 'datadev-session-test');

  beforeEach(() => {
    rmSync(testDir, { recursive: true, force: true });
    mkdirSync(testDir, { recursive: true });
  });

  afterEach(() => {
    rmSync(testDir, { recursive: true, force: true });
  });

  it('should create a new session', () => {
    const manager = new SessionManager(testDir);
    const session = manager.createSession();
    expect(session.id).toBeDefined();
    expect(session.messages).toHaveLength(0);
  });

  it('should add messages to session', () => {
    const manager = new SessionManager(testDir);
    manager.createSession();
    manager.addMessage('user', 'Hello');
    manager.addMessage('assistant', 'Hi there');

    const session = manager.getCurrentSession()!;
    expect(session.messages).toHaveLength(2);
    expect(session.messages[0].role).toBe('user');
  });

  it('should save and list sessions', () => {
    const manager = new SessionManager(testDir);
    manager.createSession();
    manager.addMessage('user', 'test');
    manager.saveSession();

    const sessions = manager.listSessions();
    expect(sessions.length).toBeGreaterThan(0);
    expect(sessions[0].messageCount).toBe(1);
  });
});
