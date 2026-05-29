import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { MCPClient } from '../../../src/tools/mcp/client';

describe('MCPClient', () => {
  beforeEach(() => {
    vi.spyOn(console, 'log').mockImplementation(() => {});
    vi.spyOn(console, 'error').mockImplementation(() => {});
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('should create client with server config', () => {
    const client = new MCPClient({
      name: 'test',
      command: 'node',
      args: ['-e', 'console.log("test")']
    });
    expect(client).toBeDefined();
  });

  it('should have stop method', () => {
    const client = new MCPClient({
      name: 'test',
      command: 'echo',
      args: ['hello']
    });
    expect(() => client.stop()).not.toThrow();
  });
});
