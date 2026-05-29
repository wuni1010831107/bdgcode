import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { writeFileSync, mkdirSync, rmSync } from 'fs';
import { loadConfig } from '../../src/config/index';

describe('YAML Config', () => {
  const testDir = '/tmp/datadev-test-config';

  beforeEach(() => {
    rmSync(testDir, { recursive: true, force: true });
    mkdirSync(testDir, { recursive: true });
  });

  afterEach(() => {
    rmSync(testDir, { recursive: true, force: true });
  });

  it('should load YAML config file', () => {
    const configPath = `${testDir}/config.yaml`;
    writeFileSync(configPath, `
llm:
  provider: anthropic
  api_key: test-key
  model: claude-sonnet-4-6
telemetry:
  enabled: true
sources: []
security:
  sensitive_patterns_path: knowledge/security/sensitive-patterns.json
  masking_enabled: true
  audit_log_path: ~/.datadev-agent/audit.log
knowledge_path: knowledge
`);
    const config = loadConfig(configPath);
    expect(config.llm.provider).toBe('anthropic');
    expect(config.llm.apiKey).toBe('test-key');
    expect(config.telemetry.enabled).toBe(true);
  });

  it('should merge with defaults', () => {
    const configPath = `${testDir}/config.yaml`;
    writeFileSync(configPath, `
llm:
  provider: openai
`);
    const config = loadConfig(configPath);
    expect(config.llm.provider).toBe('openai');
    expect(config.llm.model).toBe('claude-sonnet-4-6'); // default preserved
  });
});
