export interface MCPServer {
  name: string;
  command: string;
  args?: string[];
  env?: Record<string, string>;
}

export interface MCPTool {
  name: string;
  description: string;
  inputSchema: Record<string, any>;
}

export interface MCPRequest {
  jsonrpc: '2.0';
  id: number;
  method: string;
  params?: any;
}

export interface MCPResponse {
  jsonrpc: '2.0';
  id: number;
  result?: any;
  error?: { code: number; message: string };
}
