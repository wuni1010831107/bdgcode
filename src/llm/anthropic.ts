import Anthropic from '@anthropic-ai/sdk';
import { LLMProvider, Message, Tool, LLMResponse } from './types';

export class AnthropicProvider implements LLMProvider {
  private client: Anthropic;
  private model: string;

  constructor(config: { apiKey: string; model: string }) {
    this.client = new Anthropic({ apiKey: config.apiKey });
    this.model = config.model;
  }

  async sendMessage(messages: Message[], tools?: Tool[]): Promise<LLMResponse> {
    const response = await this.client.messages.create({
      model: this.model,
      max_tokens: 4096,
      messages: messages.map(m => ({
        role: m.role as 'user' | 'assistant',
        content: m.content
      })),
      tools: tools?.map(t => ({
        name: t.name,
        description: t.description,
        input_schema: t.input_schema
      }))
    });

    const content = response.content
      .filter((block: any) => block.type === 'text')
      .map((block: any) => block.text)
      .join('\n');

    const toolCalls = response.content
      .filter((block: any) => block.type === 'tool_use')
      .map((block: any) => ({
        id: block.id,
        name: block.name,
        arguments: block.input
      }));

    return {
      content,
      toolCalls: toolCalls.length > 0 ? toolCalls : undefined,
      usage: {
        inputTokens: response.usage.input_tokens,
        outputTokens: response.usage.output_tokens
      }
    };
  }

  getProviderName(): string {
    return 'anthropic';
  }

  estimateCost(inputTokens: number, outputTokens: number): number {
    return (inputTokens * 3 + outputTokens * 15) / 1_000_000;
  }
}
