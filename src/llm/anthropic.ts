import Anthropic from '@anthropic-ai/sdk';
import chalk from 'chalk';
import { LLMProvider, Message, Tool, LLMResponse } from './types';

const MAX_RETRIES = 3;
const RETRY_DELAYS_MS = [1000, 2000, 4000];

const RETRYABLE_STATUS_CODES = new Set([429, 500, 502, 503, 504]);
const NON_RETRYABLE_STATUS_CODES = new Set([400, 401, 403, 404]);

function isRetryable(error: any): boolean {
  if (error instanceof Error) {
    // Network errors, timeouts, connection issues
    return true;
  }

  const status = error?.status ?? error?.statusCode;
  if (status === undefined || status === null) return true;

  if (NON_RETRYABLE_STATUS_CODES.has(status)) return false;
  if (RETRYABLE_STATUS_CODES.has(status)) return true;

  return false;
}

function sleep(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
}

interface CacheControlBlock {
  type: 'text';
  text: string;
  cache_control?: { type: 'ephemeral' };
}

function withCacheControl(text: string): CacheControlBlock {
  return {
    type: 'text',
    text,
    cache_control: { type: 'ephemeral' }
  };
}

export class AnthropicProvider implements LLMProvider {
  private client: Anthropic;
  private model: string;

  constructor(config: { apiKey: string; model: string }) {
    this.client = new Anthropic({ apiKey: config.apiKey });
    this.model = config.model;
  }

  async sendMessage(messages: Message[], tools?: Tool[]): Promise<LLMResponse> {
    let lastError: any;

    for (let attempt = 0; attempt <= MAX_RETRIES; attempt++) {
      try {
        // Separate system message from conversation messages
        const systemMessage = messages.find(m => m.role === 'system');
        const conversationMessages = messages.filter(m => m.role !== 'system');

        // Build system param with ephemeral cache_control
        let systemParam: string | CacheControlBlock[] | undefined;
        if (systemMessage) {
          systemParam = [withCacheControl(systemMessage.content)];
        }

        // Add cache_control to the first user message (knowledge injection block)
        const processedMessages = conversationMessages.map((m, idx) => {
          if (m.role === 'user' && idx === 0 && systemMessage) {
            return {
              role: m.role as 'user',
              content: [withCacheControl(m.content)]
            };
          }
          return {
            role: m.role as 'user' | 'assistant',
            content: m.content
          };
        });

        // Use beta API for prompt caching support (cache_control)
        // Falls back to regular API if beta is not available
        const betaMessages = (this.client as any).beta?.messages;
        const createFn = betaMessages
          ? betaMessages.create.bind(betaMessages)
          : this.client.messages.create.bind(this.client.messages);

        const response = await createFn({
          model: this.model,
          max_tokens: 4096,
          messages: processedMessages,
          tools: tools?.map(t => ({
            name: t.name,
            description: t.description,
            input_schema: t.input_schema
          })),
          system: systemParam
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
      } catch (error) {
        lastError = error;

        if (attempt < MAX_RETRIES && isRetryable(error)) {
          const delay = RETRY_DELAYS_MS[attempt];
          console.log(
            chalk.yellow(
              `⚠️  LLM request failed (attempt ${attempt + 1}/${MAX_RETRIES}), retrying in ${delay}ms...`
            )
          );
          await sleep(delay);
        } else {
          break;
        }
      }
    }

    throw lastError;
  }

  getProviderName(): string {
    return 'anthropic';
  }

  estimateCost(inputTokens: number, outputTokens: number): number {
    return (inputTokens * 3 + outputTokens * 15) / 1_000_000;
  }
}
