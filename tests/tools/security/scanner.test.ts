import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { SecurityScanner } from '../../../src/tools/security/scanner';
import { writeFileSync, rmSync } from 'fs';

describe('SecurityScanner', () => {
  let scanner: SecurityScanner;
  const testPatternsPath = '/tmp/test-security-patterns.json';

  beforeEach(() => {
    rmSync(testPatternsPath, { force: true });
    writeFileSync(testPatternsPath, JSON.stringify({
      patterns: [
        { name: 'phone', regex: 'phone|mobile|tel', category: 'PII', severity: 'high', masking: '138****1234' },
        { name: 'email', regex: 'email|mail', category: 'PII', severity: 'medium', masking: '***@***' },
        { name: 'id_card', regex: 'id_card|idcard|sfzh', category: 'PII', severity: 'critical', masking: '****' },
        { name: 'bank', regex: 'bank|card_number', category: 'PII', severity: 'high', masking: '**** ****' }
      ]
    }));
    scanner = new SecurityScanner(testPatternsPath);
  });

  afterEach(() => {
    rmSync(testPatternsPath, { force: true });
  });

  it('should detect phone field', () => {
    const result = scanner.scanTable('users', [
      { name: 'user_id', type: 'STRING' },
      { name: 'phone_number', type: 'STRING' },
      { name: 'email', type: 'STRING' }
    ]);

    expect(result.fields.length).toBe(2);
    expect(result.fields.some(f => f.name === 'phone_number')).toBe(true);
    expect(result.fields.some(f => f.name === 'email')).toBe(true);
    expect(result.riskLevel).toBe('high');
  });

  it('should detect id card as critical', () => {
    const result = scanner.scanTable('users', [
      { name: 'user_id', type: 'STRING' },
      { name: 'id_card', type: 'STRING' }
    ]);

    expect(result.fields.some(f => f.name === 'id_card')).toBe(true);
    expect(result.riskLevel).toBe('critical');
  });

  it('should return low risk for clean table', () => {
    const result = scanner.scanTable('products', [
      { name: 'product_id', type: 'STRING' },
      { name: 'name', type: 'STRING' },
      { name: 'price', type: 'DOUBLE' }
    ]);

    expect(result.fields).toHaveLength(0);
    expect(result.riskLevel).toBe('low');
  });

  it('should generate masking SQL', () => {
    const sql = scanner.generateMaskingSQL('users', [
      { name: 'phone_number', regex: 'phone', category: 'PII', severity: 'high', masking: '138****1234' },
      { name: 'email', regex: 'email', category: 'PII', severity: 'medium', masking: '***@***' }
    ]);

    expect(sql).toContain('CREATE VIEW users_masked');
    expect(sql).toContain('CASE WHEN LENGTH(phone_number)');
    expect(sql).toContain('REPEAT');
  });

  it('should handle missing patterns file', () => {
    const emptyScanner = new SecurityScanner('/tmp/nonexistent-patterns.json');
    const result = emptyScanner.scanTable('test', [
      { name: 'phone', type: 'STRING' }
    ]);
    expect(result.fields).toHaveLength(0);
  });

  it('should provide recommendations', () => {
    const result = scanner.scanTable('users', [
      { name: 'phone_number', type: 'STRING' }
    ]);

    expect(result.recommendations.length).toBeGreaterThan(0);
    expect(result.recommendations[0]).toContain('masking');
  });
});
