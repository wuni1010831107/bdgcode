import { describe, it, expect, vi } from 'vitest';
import { AnthropicProvider } from '../../src/llm/anthropic';

describe('AnthropicProvider', () => {
  it('should return provider name', () => {
    const provider = new AnthropicProvider({
      apiKey: 'test-key',
      model: 'claude-sonnet-4-6'
    });
    expect(provider.getProviderName()).toBe('anthropic');
  });

  it('should estimate cost correctly', () => {
    const provider = new AnthropicProvider({
      apiKey: 'test-key',
      model: 'claude-sonnet-4-6'
    });
    const cost = provider.estimateCost(1000, 500);
    expect(cost).toBeCloseTo((1000 * 3 + 500 * 15) / 1_000_000, 5);
  });

  it('should create provider via factory', async () => {
    const { createLLMProvider } = await import('../../src/llm/provider');
    const provider = createLLMProvider({
      provider: 'anthropic',
      apiKey: 'test-key',
      model: 'claude-sonnet-4-6'
    });
    expect(provider.getProviderName()).toBe('anthropic');
  });
});
