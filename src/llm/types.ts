export interface Message {
  role: 'user' | 'assistant' | 'system';
  content: string;
}

export interface Tool {
  name: string;
  description: string;
  input_schema: {
    type: 'object';
    properties: Record<string, any>;
  };
}

export interface LLMResponse {
  content: string;
  toolCalls?: ToolCall[];
  usage: {
    inputTokens: number;
    outputTokens: number;
  };
}

export interface ToolCall {
  id: string;
  name: string;
  arguments: Record<string, any>;
}

export interface LLMProvider {
  sendMessage(messages: Message[], tools?: Tool[]): Promise<LLMResponse>;
  getProviderName(): string;
  estimateCost(inputTokens: number, outputTokens: number): number;
}
