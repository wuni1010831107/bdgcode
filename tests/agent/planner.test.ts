import { describe, it, expect, vi } from 'vitest';
import { Planner } from '../../src/agent/planner';
import { Memory } from '../../src/agent/memory';
import * as path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const knowledgePath = path.join(__dirname, '..', '..', 'knowledge');

describe('Planner', () => {
  const createMockLLM = () => ({
    sendMessage: vi.fn().mockResolvedValue({
      content: JSON.stringify({
        intent: 'iceberg-create',
        confidence: 0.9,
        steps: [
          { step: 1, action: 'generate-iceberg-ddl', description: 'Create table', params: { layer: 'dwd', table_name: 'user_behavior' } }
        ],
        requiresConfirmation: true
      }),
      usage: { inputTokens: 100, outputTokens: 50 }
    }),
    getProviderName: () => 'test',
    estimateCost: () => 0
  });

  it('should identify iceberg-create intent', async () => {
    const memory = new Memory(knowledgePath, '/tmp/test');
    const planner = new Planner(createMockLLM() as any, memory);

    const plan = await planner.plan('Create an Iceberg table for user events');

    expect(plan.intent).toBe('iceberg-create');
    expect(plan.steps.length).toBeGreaterThan(0);
    expect(plan.requiresConfirmation).toBe(true);
  });

  it('should return low confidence for unclear input', async () => {
    const mockLLM = {
      sendMessage: vi.fn().mockResolvedValue({
        content: 'I cannot determine the intent.',
        usage: { inputTokens: 50, outputTokens: 20 }
      }),
      getProviderName: () => 'test',
      estimateCost: () => 0
    };

    const memory = new Memory(knowledgePath, '/tmp/test');
    const planner = new Planner(mockLLM as any, memory);

    const plan = await planner.plan('xyz abc 123');

    expect(plan.confidence).toBe(0);
    expect(plan.steps).toHaveLength(0);
  });

  it('should include knowledge in prompt', async () => {
    const mockLLM = {
      sendMessage: vi.fn().mockResolvedValue({
        content: JSON.stringify({
          intent: 'iceberg-create',
          confidence: 0.9,
          steps: [{ step: 1, action: 'generate-iceberg-ddl', description: 'Create', params: {} }],
          requiresConfirmation: true
        }),
        usage: { inputTokens: 100, outputTokens: 50 }
      }),
      getProviderName: () => 'test',
      estimateCost: () => 0
    };

    const memory = new Memory(knowledgePath, '/tmp/test');
    const planner = new Planner(mockLLM as any, memory);

    await planner.plan('Create Iceberg table');

    const callArgs = mockLLM.sendMessage.mock.calls[0];
    expect(callArgs[0].length).toBeGreaterThan(0);
  });
});
