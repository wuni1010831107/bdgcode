import { LLMProvider, LLMResponse, Message, Tool } from './types';
import { AnthropicProvider } from './anthropic';

export interface LLMProviderConfig {
  provider: 'anthropic' | 'openai' | 'local';
  apiKey: string;
  model: string;
  baseUrl?: string;
}

export function createLLMProvider(config: LLMProviderConfig): LLMProvider {
  switch (config.provider) {
    case 'anthropic':
      return new AnthropicProvider({ apiKey: config.apiKey, model: config.model });
    case 'openai':
      throw new Error('OpenAI provider not yet implemented');
    case 'local':
      throw new Error('Local provider not yet implemented');
    default:
      throw new Error(`Unknown provider: ${config.provider}`);
  }
}
