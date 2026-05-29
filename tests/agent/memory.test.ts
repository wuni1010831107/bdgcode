import { describe, it, expect } from 'vitest';
import { Memory } from '../../src/agent/memory';
import * as path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const knowledgePath = path.join(__dirname, '..', '..', 'knowledge');

describe('Memory', () => {
  it('should initialize with empty context', () => {
    const memory = new Memory(knowledgePath, '/tmp/test-project');
    const context = memory.getContext();
    expect(context.projectPath).toBe('/tmp/test-project');
    expect(context.dataSources).toHaveLength(0);
    expect(context.existingTables).toHaveLength(0);
  });

  it('should add data sources and tables', () => {
    const memory = new Memory(knowledgePath, '/tmp/test-project');
    memory.addDataSource({
      name: 'mysql_prod',
      type: 'mysql',
      tables: ['orders', 'users']
    });
    memory.addTable({
      name: 'dwd_user_behavior',
      layer: 'dwd',
      columns: [
        { name: 'user_id', type: 'STRING', nullable: false },
        { name: 'event_time', type: 'TIMESTAMP', nullable: false }
      ]
    });

    const context = memory.getContext();
    expect(context.dataSources).toHaveLength(1);
    expect(context.dataSources[0].name).toBe('mysql_prod');
    expect(context.existingTables).toHaveLength(1);
    expect(context.existingTables[0].columns).toHaveLength(2);
  });

  it('should search knowledge base', () => {
    const memory = new Memory(knowledgePath, '/tmp/test-project');
    const results = memory.getRelevantKnowledge('iceberg');
    expect(results.length).toBeGreaterThan(0);
    expect(results).toContain('iceberg');
  });

  it('should return empty string for no knowledge match', () => {
    const memory = new Memory(knowledgePath, '/tmp/test-project');
    const results = memory.getRelevantKnowledge('xyznonexistent12345');
    expect(results).toBe('');
  });

  it('should trim messages to max context', () => {
    const memory = new Memory(knowledgePath, '/tmp/test-project');
    const messages = Array.from({ length: 30 }, (_, i) => ({
      role: 'user' as const,
      content: `message ${i}`,
      timestamp: new Date()
    }));
    const trimmed = memory.trimMessages(messages);
    expect(trimmed.length).toBe(20);
  });

  it('should not trim messages under limit', () => {
    const memory = new Memory(knowledgePath, '/tmp/test-project');
    const messages = Array.from({ length: 10 }, (_, i) => ({
      role: 'user' as const,
      content: `message ${i}`,
      timestamp: new Date()
    }));
    const trimmed = memory.trimMessages(messages);
    expect(trimmed.length).toBe(10);
  });

  it('should get knowledge for task type', () => {
    const memory = new Memory(knowledgePath, '/tmp/test-project');
    const knowledge = memory.getKnowledgeForTask('iceberg-create');
    expect(knowledge.length).toBeGreaterThan(0);
    expect(knowledge).toContain('USING iceberg');
  });
});

describe('Memory context compression', () => {
  it('should compress messages when exceeding maxContextMessages', () => {
    const memory = new Memory(knowledgePath, '/tmp/test-project');
    const messages = Array.from({ length: 25 }, (_, i) => ({
      role: 'user' as const,
      content: `message ${i}`,
      timestamp: new Date()
    }));

    const compressed = memory.compressMessages(messages);

    // Should have summary + last 10 messages
    expect(compressed.length).toBeLessThan(25);
    expect(compressed.length).toBeLessThanOrEqual(11); // 1 summary + 10 messages
  });

  it('should keep all messages when under limit', () => {
    const memory = new Memory(knowledgePath, '/tmp/test-project');
    const messages = Array.from({ length: 10 }, (_, i) => ({
      role: 'user' as const,
      content: `message ${i}`,
      timestamp: new Date()
    }));

    const compressed = memory.compressMessages(messages);
    expect(compressed.length).toBe(10);
  });

  it('should create summary message with correct format', () => {
    const memory = new Memory(knowledgePath, '/tmp/test-project');
    const messages = Array.from({ length: 25 }, (_, i) => ({
      role: 'user' as const,
      content: `message ${i}`,
      timestamp: new Date()
    }));

    const compressed = memory.compressMessages(messages);
    const summaryMsg = compressed.find((m: any) =>
      typeof m.content === 'string' && m.content.startsWith('Earlier conversation summary:')
    );

    expect(summaryMsg).toBeDefined();
    expect(summaryMsg?.role).toBe('system');
  });

  it('should preserve last 10 messages in full', () => {
    const memory = new Memory(knowledgePath, '/tmp/test-project');
    const messages = Array.from({ length: 25 }, (_, i) => ({
      role: 'user' as const,
      content: `message ${i}`,
      timestamp: new Date()
    }));

    const compressed = memory.compressMessages(messages);

    // Last 10 messages should be preserved
    const lastTen = messages.slice(-10);
    const compressedWithoutSummary = compressed.filter((m: any) => m.role !== 'system');

    expect(compressedWithoutSummary.length).toBe(10);
    expect(compressedWithoutSummary[0].content).toBe(lastTen[0].content);
    expect(compressedWithoutSummary[9].content).toBe(lastTen[9].content);
  });

  it('should include assistant messages in compression', () => {
    const memory = new Memory(knowledgePath, '/tmp/test-project');
    const messages = [
      { role: 'user' as const, content: 'hello', timestamp: new Date() },
      { role: 'assistant' as const, content: 'hi there', timestamp: new Date() },
      ...Array.from({ length: 23 }, (_, i) => ({
        role: 'user' as const,
        content: `message ${i}`,
        timestamp: new Date()
      }))
    ];

    const compressed = memory.compressMessages(messages);
    const summaryMsg = compressed.find((m: any) =>
      typeof m.content === 'string' && m.content.startsWith('Earlier conversation summary:')
    );

    expect(summaryMsg).toBeDefined();
    expect(summaryMsg?.content).toContain('hello');
    expect(summaryMsg?.content).toContain('hi there');
  });
});
