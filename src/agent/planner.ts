import { LLMProvider, Message, LLMResponse } from '../llm/types';
import { Memory } from './memory';

export interface Plan {
  intent: string;
  confidence: number;
  steps: PlanStep[];
  requiresConfirmation: boolean;
}

export interface PlanStep {
  step: number;
  action: string;
  description: string;
  params: Record<string, any>;
}

export class Planner {
  private llm: LLMProvider;
  private memory: Memory;

  constructor(llm: LLMProvider, memory: Memory) {
    this.llm = llm;
    this.memory = memory;
  }

  async plan(userInput: string): Promise<Plan> {
    const systemPrompt = this.buildSystemPrompt();
    const relevantKnowledge = this.memory.getRelevantKnowledge(userInput);

    const messages: Message[] = [
      { role: 'system', content: systemPrompt },
      { role: 'user', content: `${relevantKnowledge}\n\nUser request: ${userInput}` }
    ];

    const response = await this.llm.sendMessage(messages);

    const plan = this.extractJSON(response.content);
    if (!plan) {
      return {
        intent: 'unknown',
        confidence: 0,
        steps: [],
        requiresConfirmation: false
      };
    }

    return plan;
  }

  private extractJSON(content: string): Plan | null {
    try {
      const jsonStr = this.extractJSONObject(content);
      if (!jsonStr) return null;

      const parsed = JSON.parse(jsonStr);

      if (!parsed.intent || !Array.isArray(parsed.steps)) return null;

      return {
        intent: parsed.intent,
        confidence: parsed.confidence ?? 0.5,
        steps: parsed.steps.map((s: any, i: number) => ({
          step: s.step ?? i + 1,
          action: s.action || 'unknown',
          description: s.description || '',
          params: s.params || {}
        })),
        requiresConfirmation: parsed.requiresConfirmation ?? true
      };
    } catch {
      return null;
    }
  }

  private extractJSONObject(content: string): string | null {
    const marker = '"intent"';
    const markerIdx = content.indexOf(marker);
    if (markerIdx === -1) return null;

    let braceStart = content.lastIndexOf('{', markerIdx);
    if (braceStart === -1) return null;

    let depth = 0;
    for (let i = braceStart; i < content.length; i++) {
      if (content[i] === '{') depth++;
      else if (content[i] === '}') depth--;
      if (depth === 0) {
        return content.slice(braceStart, i + 1);
      }
    }
    return null;
  }

  private buildSystemPrompt(): string {
    return `You are a data engineering assistant. Break user requests into executable steps.

Available actions:
- generate-iceberg-ddl: Create Iceberg table DDL
- generate-spark-sql: Write Spark SQL for data processing
- generate-clickhouse-ddl: Create ClickHouse table DDL
- security-scan: Scan for sensitive data fields

Lakehouse layering:
- ODS: Raw data, no transformation
- DWD: Cleaned, standardized, dimension-enriched
- DWS: Aggregated summary tables
- ADS: Business-specific wide tables
- DIM: Dimension tables (SCD)

Table naming: {layer}_{domain}_{subject}_{granularity}
Example: dwd_user_behavior_event_iceberg

Respond ONLY with a JSON object (no other text):
{
  "intent": "iceberg-create | cdc-sync | quality-check | security-scan | clickhouse-sync | unknown",
  "confidence": 0.0-1.0,
  "steps": [
    {
      "step": 1,
      "action": "generate-iceberg-ddl",
      "description": "Create DWD layer table for user events",
      "params": { "layer": "dwd", "table_name": "user_behavior", "columns": "user_id STRING, event_time TIMESTAMP(3)", "partition_by": "days(event_time)" }
    }
  ],
  "requiresConfirmation": true
}`;
  }
}
