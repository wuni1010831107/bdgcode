import { describe, it, expect } from 'vitest';
import { loadConfig } from '../../src/config/index';

describe('Config', () => {
  it('should load default config when no config file exists', () => {
    const config = loadConfig('/nonexistent/path');
    expect(config.llm.provider).toBe('anthropic');
    expect(config.telemetry.enabled).toBe(true);
  });
});
