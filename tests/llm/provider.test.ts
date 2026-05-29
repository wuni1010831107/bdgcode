import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
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

describe('AnthropicProvider retry', () => {
  let provider: AnthropicProvider;

  beforeEach(() => {
    provider = new AnthropicProvider({
      apiKey: 'test-key',
      model: 'claude-sonnet-4-6'
    });
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('should retry on 429 rate limit and eventually succeed', async () => {
    const mockCreate = vi.fn()
      .mockRejectedValueOnce({ status: 429, message: 'Rate limited' })
      .mockRejectedValueOnce({ status: 429, message: 'Rate limited' })
      .mockResolvedValueOnce({
        content: [{ type: 'text', text: 'Success' }],
        usage: { input_tokens: 10, output_tokens: 5 }
      });

    const client = provider as any;
    client.client = {
      beta: { messages: { create: mockCreate } }
    };

    const response = await provider.sendMessage([
      { role: 'system', content: 'sys' },
      { role: 'user', content: 'test' }
    ]);

    expect(mockCreate).toHaveBeenCalledTimes(3);
    expect(response.content).toBe('Success');
  });

  it('should retry on 500 server error', async () => {
    const mockCreate = vi.fn()
      .mockRejectedValueOnce({ status: 500, message: 'Server error' })
      .mockResolvedValueOnce({
        content: [{ type: 'text', text: 'Success' }],
        usage: { input_tokens: 10, output_tokens: 5 }
      });

    const client = provider as any;
    client.client = {
      beta: { messages: { create: mockCreate } }
    };

    const response = await provider.sendMessage([
      { role: 'system', content: 'sys' },
      { role: 'user', content: 'test' }
    ]);

    expect(mockCreate).toHaveBeenCalledTimes(2);
    expect(response.content).toBe('Success');
  });

  it('should NOT retry on 400 bad request', async () => {
    const mockCreate = vi.fn()
      .mockRejectedValueOnce({ status: 400, message: 'Bad request' });

    const client = provider as any;
    client.client = {
      beta: { messages: { create: mockCreate } }
    };

    await expect(
      provider.sendMessage([{ role: 'system', content: 'sys' }, { role: 'user', content: 'test' }])
    ).rejects.toMatchObject({ status: 400 });

    expect(mockCreate).toHaveBeenCalledTimes(1);
  });

  it('should NOT retry on 401 auth error', async () => {
    const mockCreate = vi.fn()
      .mockRejectedValueOnce({ status: 401, message: 'Unauthorized' });

    const client = provider as any;
    client.client = {
      beta: { messages: { create: mockCreate } }
    };

    await expect(
      provider.sendMessage([{ role: 'system', content: 'sys' }, { role: 'user', content: 'test' }])
    ).rejects.toMatchObject({ status: 401 });

    expect(mockCreate).toHaveBeenCalledTimes(1);
  });

  it('should NOT retry on 403 forbidden', async () => {
    const mockCreate = vi.fn()
      .mockRejectedValueOnce({ status: 403, message: 'Forbidden' });

    const client = provider as any;
    client.client = {
      beta: { messages: { create: mockCreate } }
    };

    await expect(
      provider.sendMessage([{ role: 'system', content: 'sys' }, { role: 'user', content: 'test' }])
    ).rejects.toMatchObject({ status: 403 });

    expect(mockCreate).toHaveBeenCalledTimes(1);
  });

  it('should NOT retry on 404 not found', async () => {
    const mockCreate = vi.fn()
      .mockRejectedValueOnce({ status: 404, message: 'Not found' });

    const client = provider as any;
    client.client = {
      beta: { messages: { create: mockCreate } }
    };

    await expect(
      provider.sendMessage([{ role: 'system', content: 'sys' }, { role: 'user', content: 'test' }])
    ).rejects.toMatchObject({ status: 404 });

    expect(mockCreate).toHaveBeenCalledTimes(1);
  });

  it('should exhaust retries and throw last error', async () => {
    const mockCreate = vi.fn()
      .mockRejectedValueOnce({ status: 500, message: 'Error 1' })
      .mockRejectedValueOnce({ status: 502, message: 'Error 2' })
      .mockRejectedValueOnce({ status: 503, message: 'Error 3' })
      .mockRejectedValueOnce({ status: 503, message: 'Error 4' });

    const client = provider as any;
    client.client = {
      beta: { messages: { create: mockCreate } }
    };

    await expect(
      provider.sendMessage([{ role: 'system', content: 'sys' }, { role: 'user', content: 'test' }])
    ).rejects.toMatchObject({ status: 503 });

    expect(mockCreate).toHaveBeenCalledTimes(4);
  }, 15000);

  it('should retry on network errors', async () => {
    const mockCreate = vi.fn()
      .mockRejectedValueOnce(new Error('ECONNREFUSED'))
      .mockResolvedValueOnce({
        content: [{ type: 'text', text: 'Success' }],
        usage: { input_tokens: 10, output_tokens: 5 }
      });

    const client = provider as any;
    client.client = {
      beta: { messages: { create: mockCreate } }
    };

    const response = await provider.sendMessage([
      { role: 'system', content: 'sys' },
      { role: 'user', content: 'test' }
    ]);

    expect(mockCreate).toHaveBeenCalledTimes(2);
    expect(response.content).toBe('Success');
  });
});

describe('AnthropicProvider prompt caching', () => {
  it('should add cache_control to system and first user message', async () => {
    const capturedParams: any = {};
    const mockCreate = vi.fn().mockImplementation(async (params: any) => {
      capturedParams.system = params.system;
      capturedParams.messages = params.messages;
      return {
        content: [{ type: 'text', text: 'Success' }],
        usage: { input_tokens: 10, output_tokens: 5 }
      };
    });

    const provider = new AnthropicProvider({
      apiKey: 'test-key',
      model: 'claude-sonnet-4-6'
    });

    const client = provider as any;
    client.client = {
      beta: { messages: { create: mockCreate } }
    };

    await provider.sendMessage([
      { role: 'system', content: 'system prompt' },
      { role: 'user', content: 'user message with knowledge' }
    ]);

    // System should be an array with cache_control
    expect(Array.isArray(capturedParams.system)).toBe(true);
    expect(capturedParams.system[0].cache_control).toEqual({ type: 'ephemeral' });
    expect(capturedParams.system[0].text).toBe('system prompt');

    // First user message should be an array with cache_control
    expect(Array.isArray(capturedParams.messages[0].content)).toBe(true);
    expect(capturedParams.messages[0].content[0].cache_control).toEqual({ type: 'ephemeral' });
    expect(capturedParams.messages[0].content[0].text).toBe('user message with knowledge');
  });

  it('should not throw when cache_control is not supported (no beta)', async () => {
    const mockCreate = vi.fn().mockImplementation(async (params: any) => {
      return {
        content: [{ type: 'text', text: 'Success' }],
        usage: { input_tokens: 10, output_tokens: 5 }
      };
    });

    const provider = new AnthropicProvider({
      apiKey: 'test-key',
      model: 'claude-sonnet-4-6'
    });

    const client = provider as any;
    client.client = {
      messages: { create: mockCreate }
    };

    const response = await provider.sendMessage([
      { role: 'user', content: 'test' }
    ]);

    expect(response.content).toBe('Success');
    expect(mockCreate).toHaveBeenCalledTimes(1);
  });
});
