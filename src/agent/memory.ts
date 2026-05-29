import * as path from 'path';
import { KnowledgeLoader, KnowledgeItem } from '../knowledge/loader';
import { Session } from './session';

export interface DataSourceInfo {
  name: string;
  type: string;
  tables: string[];
}

export interface ColumnInfo {
  name: string;
  type: string;
  nullable: boolean;
  description?: string;
}

export interface TableInfo {
  name: string;
  layer: string;
  columns: ColumnInfo[];
  partitionBy?: string;
}

export interface UserPreferences {
  preferredLayer: string;
  namingConvention: string;
  defaultCatalog: string;
}

export interface ProjectContext {
  projectPath: string;
  dataSources: DataSourceInfo[];
  existingTables: TableInfo[];
  userPreferences: UserPreferences;
}

export class Memory {
  private knowledge: KnowledgeLoader;
  private context: ProjectContext;
  private maxContextMessages: number = 20;
  private messagesToKeepAfterCompression: number = 10;

  constructor(knowledgePath: string, projectPath: string) {
    this.knowledge = new KnowledgeLoader(knowledgePath);
    this.context = {
      projectPath,
      dataSources: [],
      existingTables: [],
      userPreferences: {
        preferredLayer: 'dwd',
        namingConvention: '{layer}_{domain}_{subject}_{granularity}',
        defaultCatalog: 'iceberg'
      }
    };
  }

  getContext(): ProjectContext {
    return this.context;
  }

  addDataSource(source: DataSourceInfo): void {
    this.context.dataSources.push(source);
  }

  addTable(table: TableInfo): void {
    this.context.existingTables.push(table);
  }

  getRelevantKnowledge(query: string): string {
    const results = this.knowledge.search(query);
    if (results.length === 0) return '';

    return results.slice(0, 3).map((r: KnowledgeItem) => `## ${r.name}\n${r.content}`).join('\n\n');
  }

  compressMessages(messages: Session['messages']): Session['messages'] {
    if (messages.length <= this.maxContextMessages) {
      return messages;
    }

    const olderMessages = messages.slice(0, messages.length - this.messagesToKeepAfterCompression);
    const recentMessages = messages.slice(-this.messagesToKeepAfterCompression);

    // Build summary from older messages
    const summaryParts = olderMessages.map(m => {
      const role = m.role === 'user' ? 'User' : 'Assistant';
      return `${role}: ${m.content}`;
    });

    const summaryContent = `Earlier conversation summary: ${summaryParts.join(' | ')}`;

    // Return summary as system message + recent messages
    return [
      { role: 'system', content: summaryContent, timestamp: new Date() },
      ...recentMessages
    ];
  }

  trimMessages(messages: Session['messages']): Session['messages'] {
    if (messages.length <= this.maxContextMessages) {
      return messages;
    }
    return messages.slice(-this.maxContextMessages);
  }

  getKnowledgeForTask(taskType: string): string {
    const categoryMap: Record<string, string> = {
      'iceberg-create': 'sql-patterns',
      'cdc-sync': 'sql-patterns',
      'cdc-mysql-iceberg': 'sql-patterns',
      'cdc-postgres-iceberg': 'sql-patterns',
      'security-scan': 'security',
      'clickhouse-sync': 'sql-patterns',
      'kafka-source': 'sql-patterns',
      'kafka-sink': 'sql-patterns',
      'realtime-dedup': 'sql-patterns',
      'realtime-window-aggregation': 'sql-patterns',
      'realtime-dimension-lookup': 'sql-patterns',
      'data-consistency-check': 'sql-patterns'
    };

    const category = categoryMap[taskType];
    if (!category) return '';

    const items = this.knowledge.loadCategory(category).filter((item: KnowledgeItem) => {
      const baseName = path.basename(item.name, path.extname(item.name));
      return baseName === taskType || baseName.startsWith(taskType + '-');
    });
    return items.slice(0, 2).map((item: KnowledgeItem) => item.content).join('\n\n');
  }
}
