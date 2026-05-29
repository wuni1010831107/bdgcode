import * as yaml from 'yaml';
import * as fs from 'fs';
import * as path from 'path';
import * as os from 'os';

export interface LLMConfig {
  provider: 'anthropic' | 'openai' | 'local';
  apiKey: string;
  model: string;
  baseUrl?: string;
}

export interface TelemetryConfig {
  enabled: boolean;
  storagePath: string;
}

export interface DataSourceConfig {
  name: string;
  type: 'iceberg' | 'clickhouse' | 'mysql' | 'postgres';
  connection: Record<string, string>;
}

export interface SecurityConfig {
  sensitivePatternsPath: string;
  maskingEnabled: boolean;
  auditLogPath: string;
}

export interface AgentConfig {
  llm: LLMConfig;
  telemetry: TelemetryConfig;
  sources: DataSourceConfig[];
  security: SecurityConfig;
  knowledgePath: string;
}

const DEFAULT_CONFIG: AgentConfig = {
  llm: {
    provider: 'anthropic',
    apiKey: process.env.ANTHROPIC_API_KEY || '',
    model: 'claude-sonnet-4-6'
  },
  telemetry: {
    enabled: true,
    storagePath: '~/.datadev-agent/telemetry'
  },
  sources: [],
  security: {
    sensitivePatternsPath: 'knowledge/security/sensitive-patterns.json',
    maskingEnabled: true,
    auditLogPath: '~/.datadev-agent/audit.log'
  },
  knowledgePath: 'knowledge'
};

export function loadConfig(configPath?: string): AgentConfig {
  const resolvedPath = configPath
    ? path.resolve(configPath)
    : path.join(os.homedir(), '.datadev-agent', 'config.yaml');

  if (!fs.existsSync(resolvedPath)) {
    return DEFAULT_CONFIG;
  }

  const content = fs.readFileSync(resolvedPath, 'utf-8');
  const parsed = yaml.parse(content);
  const normalized = normalizeKeys(parsed);

  return mergeDeep(DEFAULT_CONFIG, normalized);
}

const KEY_MAP: Record<string, string> = {
  api_key: 'apiKey',
  base_url: 'baseUrl',
  sensitive_patterns_path: 'sensitivePatternsPath',
  masking_enabled: 'maskingEnabled',
  audit_log_path: 'auditLogPath',
  storage_path: 'storagePath',
  knowledge_path: 'knowledgePath',
};

function normalizeKeys(obj: any): any {
  if (typeof obj !== 'object' || obj === null) return obj;
  if (Array.isArray(obj)) return obj.map(normalizeKeys);

  const result: Record<string, any> = {};
  for (const [key, value] of Object.entries(obj)) {
    const normalizedKey = KEY_MAP[key] || key;
    result[normalizedKey] = normalizeKeys(value);
  }
  return result;
}

function mergeDeep(target: any, source: any): any {
  const output = { ...target };
  for (const key in source) {
    if (source[key] && typeof source[key] === 'object' && !Array.isArray(source[key])) {
      output[key] = mergeDeep(target[key] || {}, source[key]);
    } else {
      output[key] = source[key];
    }
  }
  return output as AgentConfig;
}

export function resolveConfig(config: AgentConfig): AgentConfig {
  return {
    ...config,
    telemetry: {
      ...config.telemetry,
      storagePath: expandPath(config.telemetry.storagePath)
    },
    security: {
      ...config.security,
      sensitivePatternsPath: expandPath(config.security.sensitivePatternsPath),
      auditLogPath: expandPath(config.security.auditLogPath)
    }
  };
}

function expandPath(p: string): string {
  if (p.startsWith('~/')) {
    return path.join(os.homedir(), p.slice(2));
  }
  if (p === '~') {
    return os.homedir();
  }
  return p;
}
