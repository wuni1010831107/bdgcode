import { spawn } from 'child_process';
import { MCPServer, MCPTool, MCPRequest, MCPResponse } from './types';

export class MCPClient {
  private server: MCPServer;
  private process: any = null;
  private requestId: number = 0;
  private pendingRequests: Map<number, { resolve: (v: any) => void; reject: (e: Error) => void }> = new Map();

  constructor(server: MCPServer) {
    this.server = server;
  }

  async start(): Promise<void> {
    return new Promise((resolve, reject) => {
      this.process = spawn(this.server.command, this.server.args || [], {
        stdio: ['pipe', 'pipe', 'inherit'],
        env: { ...process.env, ...this.server.env }
      });

      this.process.stdout.on('data', (data: Buffer) => {
        this.handleMessage(data.toString());
      });

      this.process.on('error', reject);
      setTimeout(() => resolve(), 100);
    });
  }

  async listTools(): Promise<MCPTool[]> {
    const response = await this.sendRequest('tools/list', {});
    return response.tools || [];
  }

  async callTool(name: string, args: Record<string, any>): Promise<any> {
    const response = await this.sendRequest('tools/call', {
      name,
      arguments: args
    });
    return response;
  }

  stop(): void {
    if (this.process) {
      this.process.kill();
      this.process = null;
    }
  }

  private sendRequest(method: string, params: any): Promise<any> {
    return new Promise((resolve, reject) => {
      const id = ++this.requestId;
      const request: MCPRequest = {
        jsonrpc: '2.0',
        id,
        method,
        params
      };

      this.pendingRequests.set(id, { resolve, reject });
      this.process!.stdin.write(JSON.stringify(request) + '\n');

      setTimeout(() => {
        if (this.pendingRequests.has(id)) {
          this.pendingRequests.delete(id);
          reject(new Error(`MCP request timeout: ${method}`));
        }
      }, 30000);
    });
  }

  private handleMessage(data: string): void {
    const lines = data.split('\n').filter(line => line.trim());
    for (const line of lines) {
      try {
        const response: MCPResponse = JSON.parse(line);
        const pending = this.pendingRequests.get(response.id);
        if (pending) {
          this.pendingRequests.delete(response.id);
          if (response.error) {
            pending.reject(new Error(response.error.message));
          } else {
            pending.resolve(response.result);
          }
        }
      } catch {
        // Ignore malformed JSON
      }
    }
  }
}
