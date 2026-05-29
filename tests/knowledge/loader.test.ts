import { describe, it, expect } from 'vitest';
import { KnowledgeLoader } from '../../src/knowledge/loader';
import * as path from 'path';
import * as os from 'os';

describe('KnowledgeLoader', () => {
  const knowledgePath = path.join(__dirname, '..', '..', 'knowledge');
  const loader = new KnowledgeLoader(knowledgePath);

  it('should load SQL patterns', () => {
    const patterns = loader.loadCategory('sql-patterns');
    expect(patterns.length).toBeGreaterThan(0);
    expect(patterns.some(p => p.name === 'iceberg-create.sql')).toBe(true);
  });

  it('should load security patterns', () => {
    const security = loader.loadCategory('security');
    expect(security.length).toBeGreaterThan(0);
  });

  it('should load error patterns', () => {
    const errors = loader.loadCategory('errors');
    expect(errors.length).toBeGreaterThan(0);
  });

  it('should search across categories', () => {
    const results = loader.search('iceberg');
    expect(results.length).toBeGreaterThan(0);
  });

  it('should return empty for no match', () => {
    const results = loader.search('xyznonexistent123');
    expect(results.length).toBe(0);
  });

  it('should cache results', () => {
    const patterns1 = loader.loadCategory('sql-patterns');
    const patterns2 = loader.loadCategory('sql-patterns');
    expect(patterns1).toBe(patterns2);
  });
});
